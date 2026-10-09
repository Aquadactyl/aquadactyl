<?php

use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Backup;
use GuzzleHttp\Exception\ClientException;
use Pterodactyl\Extensions\Backups\BackupManager;
use Pterodactyl\Extensions\Filesystem\S3Filesystem;
use Pterodactyl\Services\Backups\DeleteBackupService;
use Pterodactyl\Repositories\Wings\DaemonBackupRepository;
use Pterodactyl\Exceptions\Service\Backup\BackupLockedException;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

test('locked backup cannot be deleted', function () {
    $server = $this->createServerModel();
    $backup = Backup::factory()->create([
        'server_id' => $server->id,
        'is_locked' => true,
    ]);

    $this->expectException(BackupLockedException::class);

    app(DeleteBackupService::class)->handle($backup);
});

test('failed backup that is locked can be deleted', function () {
    $server = $this->createServerModel();
    $backup = Backup::factory()->create([
        'server_id' => $server->id,
        'is_locked' => true,
        'is_successful' => false,
    ]);

    $mock = $this->mock(DaemonBackupRepository::class);
    $mock->expects('setServer->delete')->with($backup)->andReturn(new Response());

    app(DeleteBackupService::class)->handle($backup);

    $backup->refresh();

    expect($backup->deleted_at)->not->toBeNull();
});

test('exception thrown due to missing backup is ignored', function () {
    $server = $this->createServerModel();
    $backup = Backup::factory()->create(['server_id' => $server->id]);

    $mock = $this->mock(DaemonBackupRepository::class);
    $mock->expects('setServer->delete')->with($backup)->andThrow(
        new DaemonConnectionException(
            new ClientException('', new Request('DELETE', '/'), new Response(404))
        )
    );

    app(DeleteBackupService::class)->handle($backup);

    $backup->refresh();

    expect($backup->deleted_at)->not->toBeNull();
});

test('exception is thrown if not 404', function () {
    $server = $this->createServerModel();
    $backup = Backup::factory()->create(['server_id' => $server->id]);

    $mock = $this->mock(DaemonBackupRepository::class);
    $mock->expects('setServer->delete')->with($backup)->andThrow(
        new DaemonConnectionException(
            new ClientException('', new Request('DELETE', '/'), new Response(500))
        )
    );

    $this->expectException(DaemonConnectionException::class);

    app(DeleteBackupService::class)->handle($backup);

    $backup->refresh();

    expect($backup->deleted_at)->toBeNull();
});

test('s3 object can be deleted', function () {
    $server = $this->createServerModel();
    $backup = Backup::factory()->create([
        'disk' => Backup::ADAPTER_AWS_S3,
        'server_id' => $server->id,
    ]);

    $manager = $this->mock(BackupManager::class);
    $adapter = $this->mock(S3Filesystem::class);

    $manager->expects('adapter')->with(Backup::ADAPTER_AWS_S3)->andReturn($adapter);

    $adapter->expects('getBucket')->andReturn('foobar');
    $adapter->expects('getClient->deleteObject')->with([
        'Bucket' => 'foobar',
        'Key' => sprintf('%s/%s.tar.gz', $server->uuid, $backup->uuid),
    ]);

    app(DeleteBackupService::class)->handle($backup);

    $this->assertSoftDeleted($backup);
});
