<?php

use GuzzleHttp\Middleware;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use GuzzleHttp\Handler\MockHandler;
use Illuminate\Support\Facades\Http;
use Pterodactyl\Models\SubdomainDomain;
use Pterodactyl\Services\Subdomains\CloudflareDns;

test('Cloudflare redirects cannot resend DNS configuration to another host', function () {
    $history = [];
    $stack = HandlerStack::create(new MockHandler([new Response(307, ['Location' => 'https://attacker.example/collect']), new Response(200, [], '{"success":true,"result":[]}')]));
    $stack->push(Middleware::history($history));
    Http::globalMiddleware(fn ($handler) => $stack);
    $domain = (new SubdomainDomain())->forceFill(['domain' => 'games.example.test', 'zone_id' => str_repeat('a', 32), 'api_token' => 'test-only-token']);
    expect(fn () => app(CloudflareDns::class)->request($domain, 'POST', '/dns_records', ['content' => '192.0.2.1']))->toThrow(RuntimeException::class, 'Cloudflare DNS request failed');
    expect($history)->toHaveCount(1)->and($history[0]['request']->getUri()->getHost())->toBe('api.cloudflare.com');
});
