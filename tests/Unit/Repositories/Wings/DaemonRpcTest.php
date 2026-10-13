<?php

use GuzzleHttp\Client;
use GuzzleHttp\Psr7\Request;
use Pterodactyl\Models\Node;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Server;
use Lcobucci\JWT\Configuration;
use GuzzleHttp\Handler\MockHandler;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use Lcobucci\JWT\Signer\Key\InMemory;
use GuzzleHttp\Exception\TransferException;
use Pterodactyl\Repositories\Wings\DaemonPowerRepository;
use Pterodactyl\Repositories\Wings\DaemonCommandRepository;
use Pterodactyl\Repositories\Wings\DaemonTransferRepository;
use Pterodactyl\Repositories\Wings\DaemonRevocationRepository;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

test('Wings RPC payloads preserve commands, power actions and revocation scopes', function (string $class, string $method, array $arguments, string $path, array $payload) {
    foreach ([false, true] as $fail) {
        $handler = new MockHandler([$fail ? new TransferException('offline', new Request('POST', 'http://wings.example.test')) : new Response(204)]);
        $client = new Client(['base_uri' => 'http://wings.example.test', 'handler' => $handler]);
        $server = (new Server())->forceFill(['uuid' => 'test-server'])->setRelation('node', new Node());
        $repository = Mockery::mock($class, [$this->app])->makePartial();
        $repository->shouldReceive('getHttpClient')->once()->andReturn($client);
        $repository->setServer($server);
        if ($fail) {
            expect(fn () => $repository->{$method}(...$arguments))->toThrow(DaemonConnectionException::class);
        } else {
            $repository->{$method}(...$arguments);
            expect($handler->getLastRequest()->getUri()->getPath())->toBe($path)
                ->and(json_decode((string) $handler->getLastRequest()->getBody(), true))->toBe($payload);
        }
    }
})->with([
    [DaemonCommandRepository::class, 'send', ['say hello'], '/api/servers/test-server/commands', ['commands' => ['say hello']]],
    [DaemonCommandRepository::class, 'send', [['say hello', 'save-all']], '/api/servers/test-server/commands', ['commands' => ['say hello', 'save-all']]],
    [DaemonPowerRepository::class, 'send', ['restart'], '/api/servers/test-server/power', ['action' => 'restart']],
    [DaemonRevocationRepository::class, 'deauthorize', ['user-uuid'], '/api/deauthorize-user', ['user' => 'user-uuid', 'servers' => []]],
    [DaemonRevocationRepository::class, 'deauthorize', ['user-uuid', ['test-server']], '/api/deauthorize-user', ['user' => 'user-uuid', 'servers' => ['test-server']]],
]);

test('Wings configuration requests include an optional API version and translate connection errors', function (?int $version) {
    foreach ([false, true] as $fail) {
        $handler = new MockHandler([$fail ? new TransferException('offline', new Request('GET', 'http://wings.example.test')) : new Response(200, [], '{"version":"1.0.0"}')]);
        $repository = Mockery::mock(DaemonConfigurationRepository::class, [$this->app])->makePartial();
        $repository->shouldReceive('getHttpClient')->once()->andReturn(new Client(['base_uri' => 'http://wings.example.test', 'handler' => $handler]));
        if ($fail) {
            expect(fn () => $repository->getSystemInformation($version))->toThrow(DaemonConnectionException::class);
        } else {
            expect($repository->getSystemInformation($version))->toBe(['version' => '1.0.0'])
                ->and($handler->getLastRequest()->getUri()->getPath())->toBe('/api/system')
                ->and($handler->getLastRequest()->getUri()->getQuery())->toBe($version === null ? '' : 'v=' . $version);
        }
    }
})->with([null, 2]);

test('Wings node configuration updates send the supplied node configuration', function (bool $fail) {
    $node = Mockery::mock(Node::class);
    $node->shouldReceive('getConfiguration')->andReturn(['uuid' => 'target-node', 'api' => ['port' => 8080]]);
    $handler = new MockHandler([$fail ? new TransferException('offline', new Request('POST', 'http://wings.example.test')) : new Response(204)]);
    $repository = Mockery::mock(DaemonConfigurationRepository::class, [$this->app])->makePartial();
    $repository->shouldReceive('getHttpClient')->once()->andReturn(new Client(['base_uri' => 'http://wings.example.test', 'handler' => $handler]));
    if ($fail) {
        expect(fn () => $repository->update($node))->toThrow(DaemonConnectionException::class);
    } else {
        expect($repository->update($node)->getStatusCode())->toBe(204)
            ->and(json_decode((string) $handler->getLastRequest()->getBody(), true))->toBe(['uuid' => 'target-node', 'api' => ['port' => 8080]]);
    }
})->with([false, true]);

test('Wings transfers include the target address and a bearer token without starting the new server', function (bool $fail) {
    $target = Mockery::mock(Node::class);
    $target->shouldReceive('getConnectionAddress')->andReturn('https://target.example.test:8080');
    $configuration = Configuration::forSymmetricSigner(new Sha256(), InMemory::plainText(str_repeat('t', 32)));
    $token = $configuration->builder()->getToken($configuration->signer(), $configuration->signingKey());
    $handler = new MockHandler([$fail ? new TransferException('offline', new Request('POST', 'http://wings.example.test')) : new Response(204)]);
    $server = (new Server())->forceFill(['uuid' => 'test-server'])->setRelation('node', new Node());
    $repository = Mockery::mock(DaemonTransferRepository::class, [$this->app])->makePartial();
    $repository->shouldReceive('getHttpClient')->once()->andReturn(new Client(['base_uri' => 'http://wings.example.test', 'handler' => $handler]));
    $repository->setServer($server);
    if ($fail) {
        expect(fn () => $repository->notify($target, $token))->toThrow(DaemonConnectionException::class);
    } else {
        $repository->notify($target, $token);
        expect(json_decode((string) $handler->getLastRequest()->getBody(), true))->toBe([
            'server_id' => 'test-server', 'url' => 'https://target.example.test:8080/api/transfers', 'token' => 'Bearer ' . $token->toString(),
            'server' => ['uuid' => 'test-server', 'start_on_completion' => false],
        ]);
    }
})->with([false, true]);
