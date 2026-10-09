<?php

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Exceptions\DisplayException;
use Illuminate\Http\Client\ConnectionException;
use Pterodactyl\Services\Eggs\EggDownloadService;
use Pterodactyl\Tests\Fixtures\EggDownloadFixture;

beforeEach(function () {
    Cache::setDefaultDriver('array');
    Cache::flush();
    Http::preventStrayRequests();
});

test('catalog is cached and fetches only the public API without credentials', function () {
    Http::fake(['https://eggs.download/api/eggs' => Http::response(EggDownloadFixture::catalog())]);
    $service = app(EggDownloadService::class);
    expect($service->catalog())->toHaveCount(3)->and($service->catalog())->toHaveCount(3);
    Http::assertSentCount(1);
    Http::assertSent(fn ($request) => $request->url() === 'https://eggs.download/api/eggs' && !$request->hasHeader('Authorization'));
});

test('catalog drops invalid paths and unknown sources', function () {
    Http::fake(['*' => Http::response([
        ...EggDownloadFixture::catalog(),
        ['slug' => '../../internal', 'name' => 'Invalid', 'category' => 'testing', 'repo' => 'test', 'source' => 'pterodactyl'],
        ['slug' => 'unknown', 'name' => 'Unknown', 'category' => 'testing', 'repo' => 'test', 'source' => 'unknown'],
    ])]);
    expect(app(EggDownloadService::class)->catalog())->toHaveCount(3);
});

test('detail caching preserves the complete egg document', function () {
    $document = EggDownloadFixture::document();
    Http::fake(['*' => Http::response($document)]);
    $service = app(EggDownloadService::class);
    expect($service->detail('library-test')['egg'])->toBe($document['egg']);
    expect($service->detail('library-test')['readme'])->toBe('Test setup notes.');
    Http::assertSentCount(1);
});

test('invalid identifiers never trigger an outbound request', function (string $slug) {
    Http::fake();
    expect(fn () => app(EggDownloadService::class)->detail($slug))
        ->toThrow(DisplayException::class, 'The selected egg identifier is invalid.');
    Http::assertNothingSent();
})->with(['../internal', 'https://example.com/egg', 'egg?url=internal', 'egg#fragment', 'egg%2fother', '']);

test('API errors produce useful messages and are not cached', function (int $status, string $message) {
    Http::fake(['*' => Http::response([], $status)]);
    $service = app(EggDownloadService::class);
    for ($i = 0; $i < 2; ++$i) {
        expect(fn () => $service->catalog())->toThrow(DisplayException::class, $message);
    }
    Http::assertSentCount(2);
})->with([
    [429, 'eggs.download is limiting requests.'],
    [503, 'eggs.download is temporarily unavailable.'],
    [404, 'This egg is no longer available'],
    [302, 'eggs.download is temporarily unavailable.'],
]);

test('connection failures do not expose network details', function () {
    Http::fake(fn () => throw new ConnectionException('private-network-details'));
    expect(fn () => app(EggDownloadService::class)->catalog())
        ->toThrow(DisplayException::class, 'Could not reach eggs.download. Please try again in a moment.');
});

test('malformed and oversized responses are rejected before importing', function (string $body, string $message) {
    Http::fake(['*' => Http::response($body)]);
    expect(fn () => app(EggDownloadService::class)->catalog())->toThrow(DisplayException::class, $message);
})->with([
    ['not-json', 'eggs.download returned an unreadable response.'],
    ['null', 'eggs.download returned an invalid response.'],
    ['{"items":[]}', 'eggs.download returned an invalid catalog.'],
    [str_repeat('x', 2 * 1024 * 1024 + 1), 'The eggs.download response is too large'],
]);

test('detail cannot substitute a different egg for the requested slug', function () {
    $document = EggDownloadFixture::document();
    $document['meta']['slug'] = 'different-egg';
    Http::fake(['*' => Http::response($document)]);
    expect(fn () => app(EggDownloadService::class)->detail('library-test'))
        ->toThrow(DisplayException::class, 'eggs.download returned an invalid egg file.');
});

test('malformed preview fields are rejected safely', function () {
    $document = EggDownloadFixture::document();
    $document['egg']['description'] = ['unexpected-array'];
    Http::fake(['*' => Http::response($document)]);
    expect(fn () => app(EggDownloadService::class)->detail('library-test'))
        ->toThrow(DisplayException::class, 'eggs.download returned a malformed egg file.');
});
