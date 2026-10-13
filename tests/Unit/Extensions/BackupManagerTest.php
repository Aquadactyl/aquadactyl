<?php

use Pterodactyl\Extensions\Backups\BackupManager;
use Pterodactyl\Extensions\Filesystem\S3Filesystem;
use League\Flysystem\InMemory\InMemoryFilesystemAdapter;

test('backup adapters are reused until explicitly forgotten', function () {
    $manager = new BackupManager($this->app);
    $manager->setDefaultAdapter('wings');
    $first = $manager->adapter();
    $first->write('probe', 'Persisted adapter data', new League\Flysystem\Config());
    expect($manager->adapter())->toBe($first)->and($manager->adapter()->read('probe'))->toBe('Persisted adapter data');
    $manager->forget('wings');
    expect($manager->adapter())->not->toBe($first);
    $custom = new InMemoryFilesystemAdapter();
    $manager->set('injected', $custom);
    expect($manager->adapter('injected'))->toBe($custom);
    $manager->forget(['injected', 'wings']);
});

test('custom backup adapters are selected by driver type and receive their disk configuration', function () {
    config()->set('backups.disks.custom-disk', ['adapter' => 'custom', 'option' => 'configured']);
    $manager = new BackupManager($this->app);
    $adapter = new InMemoryFilesystemAdapter();
    $manager->extend('custom', function ($application, array $config) use ($adapter) {
        expect($application)->toBe($this->app)->and($config['option'])->toBe('configured');

        return $adapter;
    });
    expect($manager->adapter('custom-disk'))->toBe($adapter);
});

test('unsupported and unconfigured backup disks return actionable errors', function (string $name, ?array $configuration, string $message) {
    config()->set('backups.disks.' . $name, $configuration);
    expect(fn () => (new BackupManager($this->app))->adapter($name))->toThrow(InvalidArgumentException::class, $message);
})->with([['missing', null, 'does not have a configured adapter'], ['invalid', ['adapter' => 'invalid'], 'is not supported']]);

test('S3 backup adapters support explicit and default credentials without network requests', function (bool $explicit) {
    $configuration = ['adapter' => 's3', 'region' => 'us-east-1', 'bucket' => 'coverage-bucket', 'endpoint' => 'https://s3.example.test', 'credentials' => false];
    if ($explicit) {
        $configuration = array_replace($configuration, ['key' => 'test-key', 'secret' => 'test-secret', 'token' => 'test-session', 'prefix' => 'backups', 'options' => []]);
    }
    $manager = new BackupManager($this->app);
    $adapter = $manager->createS3Adapter($configuration);
    expect($adapter)->toBeInstanceOf(S3Filesystem::class)->and($adapter->getBucket())->toBe('coverage-bucket');
})->with([true, false]);
