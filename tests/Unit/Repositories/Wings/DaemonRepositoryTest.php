<?php

use Mockery as m;
use GuzzleHttp\Client;
use GuzzleHttp\Middleware;
use GuzzleHttp\HandlerStack;
use Pterodactyl\Models\Node;
use GuzzleHttp\Psr7\Response;
use GuzzleHttp\Handler\MockHandler;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;

test('Wings requests accept numeric timeouts stored as settings or environment strings', function (int|float|string $timeout, int|float|string $connectTimeout, float $expectedTimeout, float $expectedConnectTimeout) {
    config()->set('pterodactyl.guzzle.timeout', $timeout);
    config()->set('pterodactyl.guzzle.connect_timeout', $connectTimeout);

    $node = m::mock(Node::class);
    $node->shouldReceive('getConnectionAddress')->once()->andReturn('http://wings.example.invalid:8080');
    $node->shouldReceive('getDecryptedKey')->once()->andReturn('test-node-key');
    $options = (new DaemonServerRepository($this->app))->setNode($node)->getHttpClient()->getConfig();
    $handler = new MockHandler([new Response(200, ['Content-Type' => 'application/json'], '{"version":"test-wings"}')]);
    $client = new Client([...$options, 'handler' => $handler]);

    // Send through Guzzle's option validation, without contacting a real node.
    $response = $client->get('/api/system');
    expect($response->getStatusCode())->toBe(200)
        ->and($client->getConfig('timeout'))->toBe($expectedTimeout)
        ->and($client->getConfig('connect_timeout'))->toBe($expectedConnectTimeout)
        ->and((string) $handler->getLastRequest()->getUri())->toBe('http://wings.example.invalid:8080/api/system')
        ->and($handler->getLastRequest()->getHeaderLine('Authorization'))->toBe('Bearer test-node-key');
})->with([
    'saved settings' => ['30', '10', 30.0, 10.0],
    'environment values' => ['15', '5', 15.0, 5.0],
    'fractional seconds' => ['2.5', '0.5', 2.5, 0.5],
    'integer values' => [15, 5, 15.0, 5.0],
    'disabled timeouts' => ['0', '0', 0.0, 0.0],
]);

test('daemon redirects never forward server configuration bodies to another destination', function () {
    $node = m::mock(Node::class);
    $node->shouldReceive('getConnectionAddress')->andReturn('https://wings.example.test');
    $node->shouldReceive('getDecryptedKey')->andReturn('test-node-key');
    $options = (new DaemonServerRepository($this->app))->setNode($node)->getHttpClient()->getConfig();
    $history = [];
    $stack = HandlerStack::create(new MockHandler([new Response(307, ['Location' => 'https://attacker.example/collect']), new Response(200)]));
    $stack->push(Middleware::history($history));
    $client = new Client([...$options, 'handler' => $stack]);
    $response = $client->post('/api/servers', ['json' => ['environment' => ['PASSWORD' => 'test-only-secret']]]);
    expect($response->getStatusCode())->toBe(307)->and($history)->toHaveCount(1);
});
