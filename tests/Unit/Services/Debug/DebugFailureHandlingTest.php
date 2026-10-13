<?php

use Pterodactyl\Models\Node;

require_once __DIR__ . '/../../../Fixtures/RuntimeFaults.php';
afterEach(function () { Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled = []; });
use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Http;
use Pterodactyl\Services\Debug\DebugPasteService;
use Pterodactyl\Services\Debug\ConsoleLogRedactor;

test('debug uploads require a configured endpoint and an accepted upstream response', function (bool $configured) {
    config()->set('aquadactyl.debug.endpoint', $configured ? 'https://debug.example.test' : '');
    Http::fake(['*' => Http::response(['success' => false])]);
    expect(fn () => (new DebugPasteService())->upload('Console log', 3600))->toThrow(RuntimeException::class, $configured ? 'rejected' : 'not configured');
    if (!$configured) {
        Http::assertNothingSent();
    }
})->with([true, false]);

test('missing log files cannot be read or uploaded', function () {
    Http::fake();
    expect(fn () => (new DebugPasteService())->readLog('/missing-coverage-log'))->toThrow(RuntimeException::class, 'does not exist or is not readable');
    Http::assertNothingSent();
});

test('regex engine exhaustion fails closed without uploading unredacted log content', function () {
    $limit = ini_get('pcre.backtrack_limit');
    ini_set('pcre.backtrack_limit', '0');
    Http::fake();
    try {
        expect(fn () => (new DebugPasteService())->redact('password=secret'))->toThrow(RuntimeException::class, 'redaction failed');
        Http::assertNothingSent();
    } finally {
        ini_set('pcre.backtrack_limit', $limit);
    }
});

test('console redaction rejects regex exhaustion before returning partial output', function () {
    $limit = ini_get('pcre.backtrack_limit');
    ini_set('pcre.backtrack_limit', '0');
    $server = (new Server())->forceFill(['uuid' => fake()->uuid()]);
    $server->setRelation('node', new Node())->setRelation('variables', collect())->setRelation('allocations', collect());
    try {
        expect(fn () => (new ConsoleLogRedactor(new DebugPasteService()))->redact("\033[31mpassword=secret", $server))->toThrow(RuntimeException::class, 'redaction failed');
    } finally {
        ini_set('pcre.backtrack_limit', $limit);
    }
});

test('every console redaction stage fails closed if the regex engine cannot complete', function (int $stage) {
    Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled = ['console.regex_fail_on' => $stage, 'console.regex_calls' => 0];
    $server = (new Server())->forceFill(['uuid' => fake()->uuid()]);
    $server->setRelation('node', new Node())->setRelation('variables', collect())->setRelation('allocations', collect());
    expect(fn () => (new ConsoleLogRedactor(new DebugPasteService()))->redact('Console logs password=secret 2001:db8::1', $server))->toThrow(RuntimeException::class, 'Console log redaction failed');
})->with([5, 6, 7]);
