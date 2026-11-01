<?php

use GuzzleHttp\Client;
use Pterodactyl\Models\Node;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Backup;
use Pterodactyl\Models\Server;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\Exception\TransferException;
use Pterodactyl\Repositories\Wings\DaemonBackupRepository;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

dataset('Wings server operations', [
    ['getDetails', [], 'GET', '/api/servers/test-server', null],
    ['create', [false], 'POST', '/api/servers', ['uuid' => 'test-server', 'start_on_completion' => false]],
    ['sync', [], 'POST', '/api/servers/test-server/sync', null],
    ['delete', [], 'DELETE', '/api/servers/test-server', null],
    ['reinstall', [], 'POST', '/api/servers/test-server/reinstall', null],
    ['requestArchive', [], 'POST', '/api/servers/test-server/archive', null],
    ['revokeUserJTI', [42], 'POST', '/api/servers/test-server/ws/deny', ['jtis' => [md5('42test-server')]]],
]);

test('server operations send the correct Wings request and expose connection failures', function (string $operation, array $arguments, string $verb, string $path, ?array $payload) {
    foreach ([false, true] as $fail) {
        $handler = new MockHandler([$fail ? new TransferException('offline', new GuzzleHttp\Psr7\Request('GET', 'http://wings.example.test')) : new Response(200, [], '{"state":"running"}')]);
        $client = new Client(['base_uri' => 'http://wings.example.test', 'handler' => $handler]);
        $server = (new Server())->forceFill(['uuid' => 'test-server'])->setRelation('node', new Node());
        $repository = Mockery::mock(DaemonServerRepository::class, [$this->app])->makePartial();
        $repository->shouldReceive('getHttpClient')->once()->andReturn($client);
        $repository->setServer($server);
        if ($fail) {
            expect(fn () => $repository->{$operation}(...$arguments))->toThrow(DaemonConnectionException::class);
            continue;
        }
        $result = $repository->{$operation}(...$arguments);
        expect($handler->getLastRequest()->getMethod())->toBe($verb)
            ->and($handler->getLastRequest()->getUri()->getPath())->toBe($path);
        if ($payload !== null) {
            expect(json_decode((string) $handler->getLastRequest()->getBody(), true))->toBe($payload);
        }
        if ($operation === 'getDetails') {
            expect($result)->toBe(['state' => 'running']);
        }
    }
})->with('Wings server operations');

test('backup operations preserve adapter, ignore patterns and restore options', function (string $operation, bool $customize) {
    config()->set('backups.default', 'wings');
    $backup = (new Backup())->forceFill(['uuid' => 'test-backup', 'disk' => 's3', 'ignored_files' => ['logs/*', '*.tmp']]);
    foreach ([false, true] as $fail) {
        $handler = new MockHandler([$fail ? new TransferException('offline', new GuzzleHttp\Psr7\Request('GET', 'http://wings.example.test')) : new Response(204)]);
        $client = new Client(['base_uri' => 'http://wings.example.test', 'handler' => $handler]);
        $server = (new Server())->forceFill(['uuid' => 'test-server'])->setRelation('node', new Node());
        $repository = Mockery::mock(DaemonBackupRepository::class, [$this->app])->makePartial();
        $repository->shouldReceive('getHttpClient')->once()->andReturn($client);
        $repository->setServer($server);
        if ($customize) {
            expect($repository->setBackupAdapter('s3'))->toBe($repository);
        }
        $arguments = $operation === 'restore' ? [$backup, $customize ? 'https://storage.example.test/backup' : null, $customize] : [$backup];
        if ($fail) {
            expect(fn () => $repository->{$operation}(...$arguments))->toThrow(DaemonConnectionException::class);
            continue;
        }
        expect($repository->{$operation}(...$arguments)->getStatusCode())->toBe(204);
        $request = $handler->getLastRequest();
        if ($operation === 'backup') {
            expect(json_decode((string) $request->getBody(), true))->toBe(['adapter' => $customize ? 's3' : 'wings', 'uuid' => 'test-backup', 'ignore' => "logs/*\n*.tmp"]);
        } elseif ($operation === 'restore') {
            expect(json_decode((string) $request->getBody(), true))->toBe(['adapter' => 's3', 'truncate_directory' => $customize, 'download_url' => $customize ? 'https://storage.example.test/backup' : '']);
        } else {
            expect($request->getMethod())->toBe('DELETE')
                ->and($request->getUri()->getPath())->toBe('/api/servers/test-server/backup/test-backup');
        }
    }
})->with([['backup', false], ['backup', true], ['restore', false], ['restore', true], ['delete', false]]);
