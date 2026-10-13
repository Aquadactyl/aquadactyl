<?php

use GuzzleHttp\Client;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use GuzzleHttp\Handler\MockHandler;
use Illuminate\Contracts\Cache\Repository;
use GuzzleHttp\Exception\TransferException;
use Pterodactyl\Services\Helpers\SoftwareVersionService;

test('version metadata is cached and supports release and development version checks', function () {
    config()->set('pterodactyl.cdn.url', 'https://cdn.example.test/versions');
    config()->set('app.version', '1.0.0');
    $client = new Client(['handler' => new MockHandler([new Response(200, [], '{"panel":"1.1.0","wings":"1.2.0","discord":"https://community.example.test","donations":"https://sponsors.example.test"}')])]);
    $cache = Mockery::mock(Repository::class);
    $cache->shouldReceive('remember')->once()->with(SoftwareVersionService::VERSION_CACHE_KEY, Mockery::any(), Mockery::type('Closure'))->andReturnUsing(fn ($key, $expires, $callback) => $callback());
    $service = new SoftwareVersionService($cache, $client);
    expect($service->getPanel())->toBe('1.1.0')->and($service->getDaemon())->toBe('1.2.0')
        ->and($service->getDiscord())->toBe('https://community.example.test')
        ->and($service->getDonations())->toBe('https://sponsors.example.test')
        ->and($service->isLatestPanel())->toBeFalse()
        ->and($service->isLatestDaemon('1.1.0'))->toBeFalse()
        ->and($service->isLatestDaemon('1.2.0'))->toBeTrue()
        ->and($service->isLatestDaemon('develop'))->toBeTrue();
    config()->set('app.version', 'canary');
    expect($service->isLatestPanel())->toBeTrue();
});

test('unavailable version endpoints fall back to safe defaults', function (bool $transportFailure) {
    config()->set('pterodactyl.cdn.url', 'https://cdn.example.test/versions');
    $response = $transportFailure ? new TransferException('offline', new Request('GET', 'https://cdn.example.test')) : new Response(202);
    $client = new Client(['handler' => new MockHandler([$response])]);
    $cache = Mockery::mock(Repository::class);
    $cache->shouldReceive('remember')->andReturnUsing(fn ($key, $expires, $callback) => $callback());
    $service = new SoftwareVersionService($cache, $client);
    expect($service->getPanel())->toBe('error')->and($service->getDaemon())->toBe('error')
        ->and($service->getDiscord())->toBe('https://pterodactyl.io/discord')
        ->and($service->getDonations())->toBe('https://github.com/sponsors/matthewpi');
})->with([false, true]);
