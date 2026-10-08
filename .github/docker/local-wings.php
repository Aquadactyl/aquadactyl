<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\Location;
use Symfony\Component\Yaml\Yaml;
use Illuminate\Support\Facades\DB;
use Pterodactyl\Models\Allocation;
use Illuminate\Contracts\Console\Kernel;
use Pterodactyl\Services\Nodes\NodeCreationService;

// Only the local Compose setup service runs this bootstrap.
if (getenv('AQUADACTYL_LOCAL_SETUP') !== 'true') {
    fwrite(STDERR, "Wings auto-setup is only available in the local test stack.\n");
    exit(1);
}

require __DIR__ . '/../../vendor/autoload.php';
Dotenv\Dotenv::createImmutable('/app/var')->safeLoad();
$app = require __DIR__ . '/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
set_exception_handler(function (Throwable $exception) {
    fwrite(STDERR, 'Local Wings setup failed: ' . $exception->getMessage() . "\n");
    exit(1);
});

$apiPort = filter_var(getenv('AQUADACTYL_WINGS_PORT'), FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 1024, 'max_range' => 65535],
]);
$sftpPort = filter_var(getenv('AQUADACTYL_SFTP_PORT'), FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 1024, 'max_range' => 65535],
]);
$gamePorts = getenv('AQUADACTYL_GAME_PORTS');
$dataRoot = getenv('AQUADACTYL_WINGS_DATA_ROOT');
$network = getenv('AQUADACTYL_WINGS_NETWORK');

if (!$apiPort || !$sftpPort || $apiPort === $sftpPort
    || !preg_match('/^(\d{4,5})-(\d{4,5})$/', $gamePorts, $matches)
    || (int) $matches[1] < 1024 || (int) $matches[2] > 65535
    || (int) $matches[1] > (int) $matches[2]
    || (int) $matches[2] - (int) $matches[1] > 99
    || !preg_match('#^/[\w./-]+$#', $dataRoot) || str_contains($dataRoot, '..')
    || !$network) {
    throw new RuntimeException('Invalid local Wings ports, Docker data path or network name.');
}

$ports = range((int) $matches[1], (int) $matches[2]);
if (in_array($apiPort, $ports, true) || in_array($sftpPort, $ports, true)) {
    throw new RuntimeException('Game allocations must not overlap the Wings API or SFTP port.');
}

$docker = new GuzzleHttp\Client([
    'base_uri' => 'http://docker/',
    'timeout' => 10,
    'curl' => [CURLOPT_UNIX_SOCKET_PATH => '/var/run/docker.sock'],
]);
$volumeName = basename(dirname($dataRoot));
$volume = json_decode($docker->get('volumes/' . rawurlencode($volumeName))->getBody(), true, 512, JSON_THROW_ON_ERROR);
if ($volume['Mountpoint'] !== $dataRoot) {
    throw new RuntimeException('Wings data path does not match the Docker volume. Set AQUADACTYL_DOCKER_ROOT to DockerRootDir from docker info.');
}
$networkDetails = json_decode($docker->get('networks/' . rawurlencode($network))->getBody(), true, 512, JSON_THROW_ON_ERROR);
$ipv4 = array_values(array_filter($networkDetails['IPAM']['Config'], fn ($item) => !str_contains($item['Subnet'], ':')))[0];

$configPath = '/etc/pterodactyl/config.yml';
$storedConfig = is_file($configPath) ? Yaml::parseFile($configPath) : [];
$node = DB::transaction(function () use ($app, $storedConfig, $apiPort, $sftpPort, $dataRoot, $ports) {
    $location = Location::query()->firstOrCreate(['short' => 'local'], [
        'long' => 'Local Docker testing',
    ]);

    $node = isset($storedConfig['uuid'])
        ? Node::query()->where('uuid', $storedConfig['uuid'])->first()
        : Node::query()->where('name', 'Local Wings')->where('fqdn', 'wings.localhost')->first();

    if (!$node) {
        $node = $app->make(NodeCreationService::class)->handle([
            'name' => 'Local Wings',
            'description' => 'Wings for the Aquadactyl local Docker test stack.',
            'location_id' => $location->id,
            'fqdn' => 'wings.localhost',
            'scheme' => 'http',
            'behind_proxy' => false,
            'public' => true,
            'memory' => 8192,
            'memory_overallocate' => 0,
            'disk' => 32768,
            'disk_overallocate' => 0,
            'upload_size' => 100,
            'daemonListen' => $apiPort,
            'daemonSFTP' => $sftpPort,
            'daemonBase' => $dataRoot . '/volumes',
        ]);
        echo "Created local Wings node.\n";
    } else {
        // Keep tokens, capacity settings and existing servers on subsequent starts.
        $node->update([
            'fqdn' => 'wings.localhost',
            'scheme' => 'http',
            'behind_proxy' => false,
            'daemonListen' => $apiPort,
            'daemonSFTP' => $sftpPort,
            'daemonBase' => $dataRoot . '/volumes',
        ]);
        echo "Reusing local Wings node.\n";
    }

    foreach ($ports as $port) {
        Allocation::query()->firstOrCreate([
            'node_id' => $node->id,
            'ip' => '127.0.0.1',
            'port' => $port,
        ], ['ip_alias' => 'localhost']);
    }

    return $node;
});

// Retain any additional Wings settings when regenerating the connection details.
$config = array_replace_recursive($storedConfig, $node->getConfiguration());
$config['app_name'] = 'Aquadactyl';
$config['remote'] = 'http://panel';
$config['allowed_origins'] = array_values(array_unique(array_merge(
    $storedConfig['allowed_origins'] ?? [],
    [getenv('APP_URL'), preg_replace('#://localhost(?=[:/]|$)#', '://127.0.0.1', getenv('APP_URL'))],
)));
$config['system']['root_directory'] = $dataRoot;
$config['system']['log_directory'] = $dataRoot . '/logs';
$config['system']['archive_directory'] = $dataRoot . '/archives';
$config['system']['backup_directory'] = $dataRoot . '/backups';
$config['system']['tmp_directory'] = $dataRoot . '/tmp';
$config['system']['timezone'] = 'Europe/London';
$config['system']['machine_id']['directory'] = $dataRoot . '/machine-id';
$config['system']['passwd']['directory'] = $dataRoot . '/etc';
$config['docker']['network']['name'] = $network;
$config['docker']['network']['network_mode'] = $network;
// Wings replaces loopback allocations with this port-publishing address.
// Docker Desktop cannot publish ports on the Linux bridge gateway, so keep
// local game ports on the host's loopback interface. IPAM still uses its gateway.
$config['docker']['network']['interface'] = '127.0.0.1';
$config['docker']['network']['interfaces']['v4'] = [
    'subnet' => $ipv4['Subnet'],
    'gateway' => $ipv4['Gateway'],
];
// Keep the internal panel address and volume paths when saving node settings in the UI.
$config['ignore_panel_config_updates'] = true;

// Wings writes empty maps as {}, which PHP otherwise parses as empty arrays.
// Keep those map types when regenerating a configuration after its first boot.
foreach ([['docker', 'registries'], ['docker', 'overhead', 'multipliers']] as $keys) {
    $entry = &$config;
    foreach ($keys as $key) {
        $entry = &$entry[$key];
    }
    if (empty($entry)) {
        $entry = new stdClass();
    }
    unset($entry);
}

$temporaryPath = $configPath . '.tmp';
if (file_put_contents($temporaryPath, Yaml::dump($config, 8, 2, Yaml::DUMP_EMPTY_ARRAY_AS_SEQUENCE | Yaml::DUMP_OBJECT_AS_MAP)) === false
    || !chmod($temporaryPath, 0600) || !rename($temporaryPath, $configPath)) {
    throw new RuntimeException('Unable to write the local Wings configuration.');
}

echo "Wings configuration saved; node {$node->id}, API {$apiPort}, SFTP {$sftpPort}.\n";
echo 'Local game allocations: ' . reset($ports) . '-' . end($ports) . ".\n";
