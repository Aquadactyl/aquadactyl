<?php

use Illuminate\Support\Str;
use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Nest;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Location;
use Symfony\Component\Yaml\Yaml;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Services\Nodes\NodeCreationService;
use Pterodactyl\Services\Users\UserCreationService;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

require __DIR__ . '/bootstrap.php';

foreach (['', '/volumes', '/logs', '/archives', '/backups', '/tmp', '/etc', '/machine-id'] as $directory) {
    $path = '/home/rootless/demo-data' . $directory;
    if (!is_dir($path)) {
        mkdir($path, 0755, true);
    }
    chown($path, 1000);
    chgrp($path, 1000);
}
chown('/etc/pterodactyl', 1000);
chgrp('/etc/pterodactyl', 1000);

if (User::query()->whereNotIn('username', ['demo', 'demo-admin'])->exists()) {
    throw new RuntimeException('Refusing to initialise a demo over existing operator accounts.');
}
foreach (['demo' => false, 'demo-admin' => true] as $username => $admin) {
    if (!User::query()->where('username', $username)->exists()) {
        $app->make(UserCreationService::class)->handle([
            'username' => $username, 'email' => $username . '@example.invalid',
            'password' => config('aquadactyl.demo.password'), 'name_first' => 'Aquadactyl',
            'name_last' => $admin ? 'Demo Admin' : 'Demo User', 'root_admin' => $admin,
        ]);
    }
}
$owner = User::query()->where('username', 'demo')->sole();
$settings = $app->make(SettingsRepositoryInterface::class);
$settings->set('settings::aquadactyl:setup:completed', 'true');
$settings->set('settings::aquadactyl:pwa:enabled', 'false');
$settings->set('settings::aquadactyl:features:player_counts', 'false');
$settings->set('settings::aquadactyl:appearance:primary_color', '#2589b8');
$blueprint = $app->make(Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Console\BlueprintConsoleLibrary::class);
$blueprint->dbSet('blueprint', 'flags:introduction_dismissed', true);
$blueprint->dbSet('blueprint', 'flags:telemetry_enabled', false);
$location = Location::query()->firstOrCreate(['short' => 'demo'], ['long' => 'Public demonstration']);
$url = parse_url(config('app.url'));
$node = Node::query()->first() ?? $app->make(NodeCreationService::class)->handle([
    'name' => 'Manta Demo', 'description' => 'Dedicated rootless runtime for demonstration servers.',
    'location_id' => $location->id, 'fqdn' => $url['host'], 'scheme' => $url['scheme'],
    'behind_proxy' => true, 'public' => true, 'memory' => 1024, 'memory_overallocate' => 0,
    'disk' => 2048, 'disk_overallocate' => 0, 'upload_size' => 1,
    'daemonListen' => $url['port'] ?? ($url['scheme'] === 'https' ? 443 : 80),
    'daemonSFTP' => 2022, 'daemonBase' => '/home/rootless/demo-data/volumes',
]);
$nest = Nest::query()->where('name', 'Demo Examples')->first() ?? Nest::forceCreate([
    'uuid' => (string) Str::uuid(), 'author' => 'demo@example.invalid', 'name' => 'Demo Examples',
    'description' => 'Small real Python workloads managed by Manta. Startup files are protected.',
]);
$egg = Egg::query()->where('nest_id', $nest->id)->first() ?? Egg::forceCreate([
    'uuid' => (string) Str::uuid(), 'nest_id' => $nest->id, 'author' => 'demo@example.invalid',
    'name' => 'Python demonstration server', 'description' => 'A real container with a console and HTTP status endpoint. Try help, status, list, say or stop.',
    'docker_images' => ['Demo Runtime' => 'aquadactyl-demo-runtime:1'], 'startup' => 'python3 -u server.py',
    'config_startup' => json_encode(['done' => 'Demo ready']), 'config_files' => '{}', 'config_logs' => '{}',
    'config_stop' => 'stop', 'script_install' => '#!/bin/sh\nexit 0', 'script_entry' => 'sh',
    'script_container' => 'alpine:3.22', 'features' => [],
]);
foreach (['Community Console', 'Example Web App'] as $index => $name) {
    $allocation = Allocation::query()->firstOrCreate([
        'node_id' => $node->id, 'ip' => '127.0.0.1', 'port' => 25565 + $index,
    ], ['ip_alias' => 'demo.local']);
    $server = Server::query()->where('name', $name)->first() ?? Server::forceCreate([
        'uuid' => (string) Str::uuid(), 'name' => $name, 'description' => 'Python example workload on Manta. Try console commands and edit welcome.txt. Resets every five minutes.',
        'node_id' => $node->id, 'owner_id' => $owner->id, 'nest_id' => $nest->id, 'egg_id' => $egg->id,
        'allocation_id' => $allocation->id, 'memory' => 512, 'swap' => 0, 'disk' => 128,
        'io' => 500, 'cpu' => 25, 'oom_disabled' => false, 'status' => null, 'skip_scripts' => true,
        'startup' => 'python3 -u server.py', 'image' => 'aquadactyl-demo-runtime:1',
        'database_limit' => 0, 'allocation_limit' => 0, 'backup_limit' => 0,
    ]);
    $allocation->update(['server_id' => $server->id]);
    $server->update(['memory' => 512]);
    demoRestoreFiles($server->uuid);
}

$config = $node->getConfiguration();
$config['api']['port'] = 8080;
$config['api']['ssl']['enabled'] = false;
$config['remote'] = 'http://panel';
$config['allowed_origins'] = [config('app.url')];
$config['ignore_panel_config_updates'] = true;
$config['system'] = array_replace_recursive($config['system'], [
    'root_directory' => '/home/rootless/demo-data', 'log_directory' => '/home/rootless/demo-data/logs',
    'archive_directory' => '/home/rootless/demo-data/archives', 'backup_directory' => '/home/rootless/demo-data/backups',
    'tmp_directory' => '/home/rootless/demo-data/tmp', 'username' => 'rootless',
    'user' => ['uid' => 1000, 'gid' => 1000, 'rootless' => ['enabled' => true, 'container_uid' => 0, 'container_gid' => 0]],
    'machine_id' => ['directory' => '/home/rootless/demo-data/machine-id'],
    'passwd' => ['directory' => '/home/rootless/demo-data/etc'], 'enable_log_rotate' => false,
]);
$config['docker'] = [
    'network' => ['name' => 'aquadactyl_demo', 'network_mode' => 'aquadactyl_demo',
        'driver' => 'bridge', 'enable_icc' => false,
        'interface' => '127.0.0.1', 'is_internal' => true, 'interfaces' => ['v4' => ['subnet' => '172.30.0.0/24', 'gateway' => '172.30.0.1'], 'v6' => ['enabled' => false]]],
    'image_pull_policy' => 'IfNotPresent', 'container_pid_limit' => 128,
    'cpu_burst' => ['enabled' => false],
];
file_put_contents('/etc/pterodactyl/config.yml', Yaml::dump($config, 8, 2, Yaml::DUMP_EMPTY_ARRAY_AS_SEQUENCE));
chmod('/etc/pterodactyl/config.yml', 0600);
chown('/etc/pterodactyl/config.yml', 1000);
chgrp('/etc/pterodactyl/config.yml', 1000);

$nginxPath = '/etc/nginx/http.d/panel.conf';
$nginx = file_get_contents($nginxPath);
if (!str_contains($nginx, 'deploy/demo/nginx-locations.conf')) {
    file_put_contents($nginxPath, str_replace('location / {', 'include /app/deploy/demo/nginx-locations.conf;' . PHP_EOL . '    location / {', $nginx));
}

$dump = demoDatabaseProcess(true);
$dump->mustRun();
file_put_contents('/app/var/demo-baseline.sql', $dump->getOutput());
chmod('/app/var/demo-baseline.sql', 0600);
file_put_contents('/app/var/demo-owned.json', json_encode(['database' => 'aquadactyl_demo', 'servers' => Server::query()->pluck('uuid')->all()]));
chmod('/app/var/demo-owned.json', 0600);
echo "Disposable demo accounts, Manta configuration and example servers ready.\n";
