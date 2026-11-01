<?php

use Illuminate\Filesystem\Filesystem;
use Pterodactyl\Services\Users\LanguageService;

test('initial labels include the viewer and installed fallbacks without unavailable packs', function () {
    config(['app.locale' => 'fr', 'app.fallback_locale' => 'missing']);
    $resources = (new LanguageService(new Filesystem()))->initialResources();
    expect(array_keys($resources))->toBe(['fr', 'en'])
        ->and($resources['fr']['panel']['language']['label'])->toBe('Langue du panel')
        ->and($resources['fr']['panel']['language']['current'])->toBe('Langue actuelle : {{language}}.')
        ->and($resources['en']['panel']['language']['current'])->toBe('Currently using {{language}}.');
});

test('frontend interpolation preserves nesting, literal content and URLs', function () {
    expect(LanguageService::forFrontend(['message' => 'Hello :name.', 'nested' => ['count' => ':count files'], 'url' => 'https://example.com', 'literal' => '</script>']))
        ->toBe(['message' => 'Hello {{name}}.', 'nested' => ['count' => '{{count}} files'], 'url' => 'https://example.com', 'literal' => '</script>']);
});
