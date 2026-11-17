<?php

use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Redis;
use Pterodactyl\Repositories\Wings\DaemonPowerRepository;

require __DIR__ . '/bootstrap.php';

$owned = json_decode(file_get_contents('/app/var/demo-owned.json'), true, 512, JSON_THROW_ON_ERROR);
if ($owned['database'] !== 'aquadactyl_demo' || count($owned['servers']) !== 2) {
    throw new RuntimeException('Demo ownership marker is invalid.');
}

function resetDemo(array $owned, $app): void
{
    $lock = fopen('/app/var/demo-reset.lock', 'c');
    if (!flock($lock, LOCK_EX | LOCK_NB)) {
        fclose($lock);

        return;
    }
    try {
        file_put_contents(config('aquadactyl.demo.reset_marker'), gmdate('c'));
        foreach ($owned['servers'] as $uuid) {
            if (!preg_match('/^[a-f0-9-]{36}$/D', $uuid)) {
                throw new RuntimeException('Invalid owned server identifier.');
            }
            $curl = curl_init('http://localhost/containers/' . $uuid . '?force=true&v=true');
            curl_setopt_array($curl, [CURLOPT_UNIX_SOCKET_PATH => '/home/rootless/docker.sock', CURLOPT_CUSTOMREQUEST => 'DELETE', CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15]);
            curl_exec($curl);
            $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            curl_close($curl);
            if (!in_array($status, [204, 404], true)) {
                throw new RuntimeException('Unable to reset a demo container.');
            }
            demoRestoreFiles($uuid);
        }
        $restore = demoDatabaseProcess(false);
        $restore->setInput(fopen('/app/var/demo-baseline.sql', 'r'));
        $restore->mustRun();
        Redis::connection()->flushdb();
        cache()->flush();
        foreach (Server::query()->whereIn('uuid', $owned['servers'])->get() as $server) {
            $app->make(DaemonPowerRepository::class)->setServer($server)->send('start');
        }
        file_put_contents('/app/var/demo-last-reset', gmdate('c'));
        unlink(config('aquadactyl.demo.reset_marker'));
        echo gmdate('c') . " Demo restored to its baseline.\n";
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

// Start the example workloads, then align every reset to a five-minute boundary.
foreach (Server::query()->whereIn('uuid', $owned['servers'])->get() as $server) {
    try {
        $app->make(DaemonPowerRepository::class)->setServer($server)->send('start');
    } catch (Throwable) {
        echo "Waiting for the demo runtime to become ready.\n";
    }
}
if (in_array('--once', $argv, true)) {
    resetDemo($owned, $app);
    exit(0);
}
while (true) {
    sleep(300 - time() % 300);
    try {
        resetDemo($owned, $app);
    } catch (Throwable) {
        fwrite(STDERR, gmdate('c') . " Demo reset failed; will retry in 30 seconds.\n");
        sleep(30);
        try {
            resetDemo($owned, $app);
        } catch (Throwable) {
            fwrite(STDERR, "Demo reset retry failed.\n");
        }
    }
}
