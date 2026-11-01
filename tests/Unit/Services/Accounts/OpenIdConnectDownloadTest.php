<?php

use GuzzleHttp\Psr7\Utils;
use GuzzleHttp\Psr7\FnStream;
use GuzzleHttp\Psr7\InflateStream;
use Illuminate\Support\Facades\Http;
use Pterodactyl\Tests\Fixtures\RuntimeFaults;
use Pterodactyl\Services\Accounts\OAuth\OpenIdConnectDiscovery;

beforeEach(function () {
    RuntimeFaults::$enabled = [];
    Http::preventStrayRequests();
});

afterEach(function () {
    RuntimeFaults::$enabled = [];
});

test('OIDC reads partial chunks, accepts the exact byte limit and closes successful response bodies', function () {
    $json = '{"value":"' . str_repeat('a', 1048576 - 12) . '"}';
    $inner = Utils::streamFor($json);
    $closed = false;
    $body = FnStream::decorate($inner, [
        'read' => fn ($length) => $inner->read(min(137, $length)),
        'close' => function () use ($inner, &$closed) {
            $closed = true;
            $inner->close();
        },
    ]);
    Http::fake(function ($request, $options) use ($body) {
        expect($options['stream'])->toBeTrue()
            ->and($options['read_timeout'])->toBe(5)
            ->and($options['allow_redirects'])->toBeFalse();

        return Http::response($body);
    });
    expect(app(OpenIdConnectDiscovery::class)->document('https://id.example.test/keys'))
        ->toBe(['value' => str_repeat('a', 1048576 - 12)])
        ->and($closed)->toBeTrue();
    Http::assertSentCount(1);
});

test('OIDC rejects oversized bodies after at most one MiB plus one decoded byte', function (bool $compressed) {
    $payload = str_repeat('a', 2 * 1048576);
    $inner = $compressed ? new InflateStream(Utils::streamFor(gzencode($payload))) : Utils::streamFor($payload);
    $bytes = 0;
    $closed = false;
    $body = FnStream::decorate($inner, [
        'read' => function ($length) use ($inner, &$bytes) {
            $chunk = $inner->read($length);
            $bytes += strlen($chunk);

            return $chunk;
        },
        'close' => function () use ($inner, &$closed) {
            $closed = true;
            $inner->close();
        },
    ]);
    Http::fake(['*' => Http::response($body)]);
    expect(fn () => app(OpenIdConnectDiscovery::class)->document('https://id.example.test/keys'))->toThrow(RuntimeException::class, 'Invalid OpenID Connect document.');
    expect($bytes)->toBe(1048577)->and($closed)->toBeTrue();
})->with([false, true]);

test('OIDC closes error responses without reading or exposing their body', function (int $status) {
    $reads = 0;
    $closed = false;
    $body = FnStream::decorate(Utils::streamFor('private upstream error'), [
        'read' => function () use (&$reads) {
            ++$reads;

            return '';
        },
        'close' => function () use (&$closed) { $closed = true; },
    ]);
    Http::fake(['*' => Http::response($body, $status)]);
    expect(fn () => app(OpenIdConnectDiscovery::class)->document('https://id.example.test/keys'))->toThrow(RuntimeException::class, 'Could not retrieve OpenID Connect document.');
    expect($reads)->toBe(0)->and($closed)->toBeTrue();
})->with([302, 400, 500]);

test('OIDC rejects stalled and failing streams and closes them', function (bool $failed) {
    $closed = false;
    $body = FnStream::decorate(Utils::streamFor('unread'), [
        'eof' => fn () => false,
        'read' => function () use ($failed) {
            if ($failed) {
                throw new RuntimeException('Read failed');
            }

            return '';
        },
        'close' => function () use (&$closed) { $closed = true; },
    ]);
    Http::fake(['*' => Http::response($body)]);
    expect(fn () => app(OpenIdConnectDiscovery::class)->document('https://id.example.test/keys'))->toThrow(RuntimeException::class);
    expect($closed)->toBeTrue();
})->with([false, true]);

test('OIDC includes headers and the final chunk in its download deadline', function (bool $duringRead) {
    RuntimeFaults::$enabled['oidc.time'] = 1_000_000_000;
    $inner = Utils::streamFor('{}');
    $closed = false;
    $body = FnStream::decorate($inner, [
        'read' => function ($length) use ($inner) {
            RuntimeFaults::$enabled['oidc.time'] += 11_000_000_000;

            return $inner->read($length);
        },
        'close' => function () use ($inner, &$closed) {
            $closed = true;
            $inner->close();
        },
    ]);
    Http::fake(function () use ($duringRead, $body) {
        if (!$duringRead) {
            RuntimeFaults::$enabled['oidc.time'] += 11_000_000_000;
        }

        return Http::response($body);
    });
    expect(fn () => app(OpenIdConnectDiscovery::class)->document('https://id.example.test/keys'))->toThrow(RuntimeException::class, 'download timed out');
    expect($closed)->toBeTrue();
})->with([false, true]);

test('OIDC rejects empty, invalid, scalar and excessively nested JSON', function (string $json) {
    Http::fake(['*' => Http::response($json)]);
    expect(fn () => app(OpenIdConnectDiscovery::class)->document('https://id.example.test/keys'))->toThrow(RuntimeException::class, 'Invalid OpenID Connect document.');
})->with(['', 'not-json', 'null', str_repeat('[', 40) . '1' . str_repeat(']', 40)]);
