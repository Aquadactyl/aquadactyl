<?php

use GuzzleHttp\Client;
use Pterodactyl\Models\Node;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Server;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\Exception\TransferException;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Pterodactyl\Exceptions\Http\Server\FileSizeTooLargeException;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

dataset('Wings file operations', [
    'read' => ['getContent', ['/server.properties'], 'GET', 'contents', null],
    'write' => ['putContent', ['/server.properties', 'motd=hello'], 'POST', 'write', null],
    'list' => ['getDirectory', ['/plugins'], 'GET', 'list-directory', null],
    'mkdir' => ['createDirectory', ['plugins', '/'], 'POST', 'create-directory', ['name' => 'plugins', 'path' => '/']],
    'rename' => ['renameFiles', [null, [['from' => 'a', 'to' => 'b']]], 'PUT', 'rename', ['root' => '/', 'files' => [['from' => 'a', 'to' => 'b']]]],
    'copy' => ['copyFile', ['/a.txt'], 'POST', 'copy', ['location' => '/a.txt']],
    'delete' => ['deleteFiles', [null, ['a.txt']], 'POST', 'delete', ['root' => '/', 'files' => ['a.txt']]],
    'compress' => ['compressFiles', ['/plugins', ['a.jar']], 'POST', 'compress', ['root' => '/plugins', 'files' => ['a.jar']]],
    'extract' => ['decompressFile', [null, 'a.zip'], 'POST', 'decompress', ['root' => '/', 'file' => 'a.zip']],
    'chmod' => ['chmodFiles', ['/plugins', [['file' => 'a.jar', 'mode' => '644']]], 'POST', 'chmod', ['root' => '/plugins', 'files' => [['file' => 'a.jar', 'mode' => '644']]]],
    'pull defaults' => ['pull', ['https://downloads.example.test/a.jar', null], 'POST', 'pull', ['url' => 'https://downloads.example.test/a.jar', 'root' => '/']],
    'pull options' => ['pull', ['https://downloads.example.test/a.jar', '/plugins', ['filename' => 'b.jar', 'use_header' => false, 'foreground' => true]], 'POST', 'pull', ['url' => 'https://downloads.example.test/a.jar', 'root' => '/plugins', 'file_name' => 'b.jar', 'use_header' => false, 'foreground' => true]],
]);

test('file operations send the server UUID and expected payload to Wings', function (string $operation, array $arguments, string $verb, string $endpoint, ?array $payload) {
    $handler = new MockHandler([new Response(200, ['Content-Length' => '12'], '{"name":"a"}')]);
    $client = new Client(['base_uri' => 'http://wings.example.test', 'handler' => $handler]);
    $server = (new Server())->forceFill(['uuid' => 'test-server'])->setRelation('node', new Node());
    $repository = Mockery::mock(DaemonFileRepository::class, [$this->app])->makePartial();
    $repository->shouldReceive('getHttpClient')->once()->andReturn($client);
    $repository->setServer($server);
    $result = $repository->{$operation}(...$arguments);
    $request = $handler->getLastRequest();
    expect($request->getMethod())->toBe($verb)
        ->and($request->getUri()->getPath())->toBe('/api/servers/test-server/files/' . $endpoint);
    if ($payload !== null) {
        expect(json_decode((string) $request->getBody(), true))->toBe($payload);
    } elseif ($operation === 'putContent') {
        expect((string) $request->getBody())->toBe('motd=hello')
            ->and($request->getUri()->getQuery())->toBe('file=%2Fserver.properties');
    } else {
        expect($request->getUri()->getQuery())->toContain($operation === 'getDirectory' ? 'directory=' : 'file=');
    }
    if (in_array($operation, ['getDirectory', 'compressFiles'])) {
        expect($result)->toBe(['name' => 'a']);
    } elseif ($operation === 'getContent') {
        expect($result)->toBe('{"name":"a"}');
    } else {
        expect($result->getStatusCode())->toBe(200);
    }
})->with('Wings file operations');

test('file operations translate transport errors into daemon connection errors', function (string $operation, array $arguments) {
    $failure = new TransferException('network unavailable', new GuzzleHttp\Psr7\Request('GET', 'http://wings.example.test'));
    $client = new Client(['base_uri' => 'http://wings.example.test', 'handler' => new MockHandler([$failure])]);
    $server = (new Server())->forceFill(['uuid' => 'test-server'])->setRelation('node', new Node());
    $repository = Mockery::mock(DaemonFileRepository::class, [$this->app])->makePartial();
    $repository->shouldReceive('getHttpClient')->once()->andReturn($client);
    $repository->setServer($server);
    expect(fn () => $repository->{$operation}(...$arguments))->toThrow(DaemonConnectionException::class);
})->with('Wings file operations');

test('file reads enforce size limits while allowing an exact limit and missing length', function (array $headers, ?int $limit, bool $reject) {
    $client = new Client(['base_uri' => 'http://wings.example.test', 'handler' => new MockHandler([new Response(200, $headers, 'hello')])]);
    $server = (new Server())->forceFill(['uuid' => 'test-server'])->setRelation('node', new Node());
    $repository = Mockery::mock(DaemonFileRepository::class, [$this->app])->makePartial();
    $repository->shouldReceive('getHttpClient')->andReturn($client);
    $repository->setServer($server);
    if ($reject) {
        expect(fn () => $repository->getContent('/file', $limit))->toThrow(FileSizeTooLargeException::class);
    } else {
        expect($repository->getContent('/file', $limit))->toBe('hello');
    }
})->with([
    [['Content-Length' => '6'], 5, true],
    [['Content-Length' => '5'], 5, false],
    [[], 5, false],
    [['Content-Length' => '500'], null, false],
]);
