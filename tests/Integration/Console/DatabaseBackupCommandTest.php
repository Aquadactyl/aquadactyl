<?php

use Illuminate\Support\Facades\File;
use Pterodactyl\Tests\Fixtures\RuntimeFaults;

require_once __DIR__ . '/../../Fixtures/RuntimeFaults.php';

beforeEach(function () {
    $this->backupDirectory = storage_path('app/backup-command-' . bin2hex(random_bytes(6)));
    File::ensureDirectoryExists($this->backupDirectory);
});

afterEach(function () {
    RuntimeFaults::$enabled = [];
    File::deleteDirectory($this->backupDirectory);
});

test('database backup produces a private consistent dump in the isolated test workspace', function () {
    $path = $this->backupDirectory . '/database.sql';
    $this->artisan('p:maintenance:backup-database', ['path' => $path])->expectsOutput('Database backup created.')->assertExitCode(0);
    expect(File::exists($path))->toBeTrue()->and(filesize($path))->toBeGreaterThan(100)
        ->and(fileperms($path) & 0777)->toBe(0600);
    expect(File::get($path))->toContain('CREATE TABLE', 'users', 'settings');
});

test('database backup rejects publicly downloadable or missing directories', function (bool $public) {
    $path = $public ? public_path('coverage-database.sql') : $this->backupDirectory . '/missing/database.sql';
    $this->artisan('p:maintenance:backup-database', ['path' => $path])->assertExitCode(1);
    expect(File::exists($path))->toBeFalse();
})->with([true, false]);

test('database backup refuses other database drivers before creating an output file', function () {
    config()->set('database.connections.mysql.driver', 'sqlite');
    $path = $this->backupDirectory . '/database.sql';
    $this->artisan('p:maintenance:backup-database', ['path' => $path])->assertExitCode(1);
    expect(File::exists($path))->toBeFalse();
});

test('a failed dump removes the incomplete output file', function () {
    config()->set('database.connections.mysql.password', 'intentionally-wrong-test-password');
    $path = $this->backupDirectory . '/database.sql';
    $this->artisan('p:maintenance:backup-database', ['path' => $path])->expectsOutput('Database backup failed. Check the dump client and database permissions.')->assertExitCode(1);
    expect(File::exists($path))->toBeFalse();
});

test('database backups stop on storage errors and remove partial output', function (string $failure) {
    RuntimeFaults::$enabled['backup.' . $failure] = true;
    $path = $this->backupDirectory . '/failed.sql';
    $this->artisan('p:maintenance:backup-database', ['path' => $path])->assertExitCode(1);
    expect(File::exists($path))->toBeFalse();
})->with(['open', 'write']);

test('write failures stop an active dump without writing its remaining output to a closed backup', function () {
    $client = $this->backupDirectory . '/mariadb-dump';
    File::put($client, <<<'PHP'
#!/usr/bin/env php
<?php
while (true) {
    fwrite(STDOUT, str_repeat('dump data', 8192));
}
PHP);
    chmod($client, 0700);
    $originalPath = getenv('PATH');
    putenv('PATH=' . $this->backupDirectory . PATH_SEPARATOR . $originalPath);
    RuntimeFaults::$enabled['backup.write'] = true;
    $path = $this->backupDirectory . '/failed-stream.sql';
    try {
        $this->artisan('p:maintenance:backup-database', ['path' => $path])->expectsOutput('Cannot complete database backup.')->assertExitCode(1);
        expect(File::exists($path))->toBeFalse();
    } finally {
        putenv('PATH=' . $originalPath);
    }
});

test('database backup socket connections are passed to the dump client and failed connections remove output', function () {
    config()->set('database.connections.mysql.unix_socket', '/nonexistent/coverage-mysql.sock');
    $path = $this->backupDirectory . '/failed-socket.sql';
    $this->artisan('p:maintenance:backup-database', ['path' => $path])->assertExitCode(1);
    expect(File::exists($path))->toBeFalse();
});
