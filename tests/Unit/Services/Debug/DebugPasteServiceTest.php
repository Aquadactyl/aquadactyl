<?php

use Illuminate\Support\Facades\Http;
use Pterodactyl\Services\Debug\DebugPasteService;

beforeEach(function () {
    $this->debug = new DebugPasteService();
    $this->directory = sys_get_temp_dir() . '/aquadactyl-debug-test-' . bin2hex(random_bytes(8));
    mkdir($this->directory);
    Http::preventStrayRequests();
    Http::fake(['https://debug.example.invalid/paste' => Http::response(['success' => true, 'id' => 'test-paste'])]);
    config()->set('aquadactyl.debug.endpoint', 'https://debug.example.invalid');
    config()->set('aquadactyl.debug.expires_in', 86400);
});

afterEach(function () {
    foreach (glob($this->directory . '/*') ?: [] as $file) {
        unlink($file);
    }
    rmdir($this->directory);
});

test('debug sharing redacts common structured and header credentials', function (string $log, string $secret) {
    $url = $this->debug->upload($log);
    expect($url)->toBe('https://debug.example.invalid/paste/test-paste');
    Http::assertSent(function ($request) use ($secret) {
        expect($request['content'])->not->toContain($secret)->toContain('[REDACTED');

        return $request->url() === 'https://debug.example.invalid/paste' && $request['expiresIn'] === '24h';
    });
})->with([
    ['DB_PASSWORD=credential-value', 'credential-value'],
    ['{"password":"credential-value"}', 'credential-value'],
    ['{"access_token":"credential-value"}', 'credential-value'],
    ['["client_secret" => "credential-value"]', 'credential-value'],
    ['Authorization: Bearer credential-value', 'credential-value'],
    ['{"Authorization":"Bearer credential-value"}', 'credential-value'],
    ['Basic Y3JlZGVudGlhbC12YWx1ZQ==', 'Y3JlZGVudGlhbC12YWx1ZQ=='],
    ['Cookie: session=credential-value; csrf=another-private-value', 'another-private-value'],
    ['redis://test-user:credential-value@cache:6379', 'credential-value'],
    ["-----BEGIN PRIVATE KEY-----\ncredential-value\n-----END PRIVATE KEY-----", 'credential-value'],
    ['APP_KEY=base64:credential-value', 'credential-value'],
    ['HASHIDS_SALT=credential-value', 'credential-value'],
]);

test('daily logging chooses the latest dated panel log', function () {
    config()->set('logging.default', 'daily');
    config()->set('logging.channels.daily.path', $this->directory . '/panel.log');
    file_put_contents($this->directory . '/panel.log', 'old single log');
    file_put_contents($this->directory . '/panel-2026-10-09.log', 'previous daily log');
    file_put_contents($this->directory . '/panel-2026-10-11.log', 'latest daily log');
    file_put_contents($this->directory . '/panel-not-a-date.log', 'unrelated file');
    expect($this->debug->readLog())->toBe('latest daily log');
    Http::assertNothingSent();
});

test('stack logging follows its configured file channel', function () {
    config()->set('logging.default', 'stack');
    config()->set('logging.channels.stack.channels', ['stderr', 'single']);
    config()->set('logging.channels.single.path', $this->directory . '/custom.log');
    file_put_contents($this->directory . '/custom.log', 'configured log');
    expect($this->debug->readLog())->toBe('configured log');
});

test('log tails respect the byte limit and remain valid UTF8', function () {
    config()->set('aquadactyl.debug.max_bytes', 9);
    $path = $this->directory . '/tail.log';
    file_put_contents($path, "old entry\nnew entry");
    expect($this->debug->readLog($path))->toBe('new entry');
    file_put_contents($path, str_repeat('é', 12));
    expect(mb_check_encoding($this->debug->readLog($path), 'UTF-8'))->toBeTrue();
});

test('previewing redacted logs never uploads them', function () {
    $path = $this->directory . '/preview.log';
    file_put_contents($path, 'password=credential-value');
    $this->artisan('p:debug', ['--file' => $path, '--dry-run' => true])
        ->expectsOutputToContain('[REDACTED]')->assertSuccessful();
    Http::assertNothingSent();
});

test('invalid expiration does not upload logs', function () {
    $this->artisan('p:debug', ['--expires' => 'invalid'])->assertFailed();
    Http::assertNothingSent();
});

test('non-web paste URLs are rejected', function () {
    Http::swap(new Illuminate\Http\Client\Factory());
    Http::preventStrayRequests();
    Http::fake(['https://debug.example.invalid/paste' => Http::response(['url' => 'javascript:alert(1)'])]);
    expect(fn () => $this->debug->upload('test'))->toThrow(RuntimeException::class, 'valid paste URL');
});

test('paste links cannot redirect users to another service or include credentials', function (string $url) {
    Http::swap(new Illuminate\Http\Client\Factory());
    Http::preventStrayRequests();
    Http::fake(['https://debug.example.invalid/paste' => Http::response(['url' => $url])]);
    expect(fn () => $this->debug->upload('test'))->toThrow(RuntimeException::class, 'valid paste URL');
})->with(['https://other.example.invalid/paste/test', 'http://debug.example.invalid/paste/test', 'https://user:password@debug.example.invalid/paste/test']);

test('supported expirations use the public API duration format', function (int $seconds, string $duration) {
    $this->debug->upload('test', $seconds);
    Http::assertSent(fn ($request) => $request['expiresIn'] === $duration);
})->with([[0, ''], [3600, '1h'], [86400, '24h'], [172800, '2d'], [604800, '7d'], [2592000, '30d']]);

test('unsupported expiration fails before sending any content', function () {
    expect(fn () => $this->debug->upload('test', 120))->toThrow(RuntimeException::class, 'expiration must');
    Http::assertNothingSent();
});

test('a console-only log channel requires an explicit file', function () {
    config()->set('logging.default', 'stderr');
    expect(fn () => $this->debug->readLog())->toThrow(RuntimeException::class, 'Pass --file');
    Http::assertNothingSent();
});

test('redaction failures stop uploads instead of sharing unredacted content', function () {
    $limit = ini_get('pcre.backtrack_limit');
    ini_set('pcre.backtrack_limit', '1');
    try {
        expect(fn () => $this->debug->upload('password="' . str_repeat('credential-value', 50) . '"'))
            ->toThrow(RuntimeException::class, 'redaction failed');
        Http::assertNothingSent();
    } finally {
        ini_set('pcre.backtrack_limit', $limit);
    }
});
