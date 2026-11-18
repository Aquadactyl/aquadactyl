<?php

use Illuminate\Contracts\Console\Kernel;

require __DIR__ . '/../../vendor/autoload.php';
if (!is_file('/app/.env') && is_file('/app/var/.env')) {
    Dotenv\Dotenv::createImmutable('/app/var')->safeLoad();
}
$app = require __DIR__ . '/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

if (!config('aquadactyl.demo.enabled') || config('database.connections.mysql.database') !== 'aquadactyl_demo') {
    throw new RuntimeException('Demo tools require demo mode and the dedicated aquadactyl_demo database.');
}

function demoDatabaseProcess(bool $dump): Symfony\Component\Process\Process
{
    $db = config('database.connections.mysql');
    $command = [$dump ? 'mariadb-dump' : 'mariadb', '--host=' . $db['host'], '--port=' . $db['port'], '--user=' . $db['username']];
    if ($dump) {
        array_push($command, '--single-transaction', '--skip-lock-tables', '--no-tablespaces');
    }
    $command[] = 'aquadactyl_demo';

    return new Symfony\Component\Process\Process($command, null, ['MYSQL_PWD' => $db['password']], null, 60);
}

function demoRestoreFiles(string $uuid): void
{
    if (!preg_match('/^[a-f0-9-]{36}$/D', $uuid)) {
        throw new RuntimeException('Invalid demo server UUID.');
    }
    $path = '/home/rootless/demo-data/volumes/' . $uuid;
    if (is_link($path)) {
        throw new RuntimeException('Demo server directory must not be a symlink.');
    }
    if (!is_dir($path)) {
        mkdir($path, 0755, true);
    }
    foreach (['server.py', 'welcome.txt'] as $file) {
        $target = $path . '/' . $file;
        if (is_link($target)) {
            throw new RuntimeException('Demo baseline files must not be symlinks.');
        }
        copy(__DIR__ . '/sample/' . $file, $target);
        chown($target, 1000);
        chgrp($target, 1000);
        chmod($target, 0644);
    }
    chown($path, 1000);
    chgrp($path, 1000);
}
