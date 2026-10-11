<?php

use Illuminate\Support\Arr;
use Matriphe\ISO639\ISO639;
use Illuminate\Http\Request;
use Illuminate\Filesystem\Filesystem;
use Pterodactyl\Services\Users\LanguageService;

test('bundled language catalogs preserve all English keys and interpolation', function (string $locale, string $catalog) {
    $english = Arr::dot(require resource_path('lang/en/' . $catalog));
    $translated = Arr::dot(require resource_path('lang/' . $locale . '/' . $catalog));
    $englishKeys = array_keys($english);
    $translatedKeys = array_keys($translated);
    sort($englishKeys);
    sort($translatedKeys);
    $this->assertSame($englishKeys, $translatedKeys, $locale . '/' . $catalog);

    foreach ($english as $key => $value) {
        $context = $locale . '/' . $catalog . ':' . $key;
        if (!is_string($value)) {
            $this->assertSame($value, $translated[$key], $context);

            continue;
        }

        $this->assertIsString($translated[$key], $context);
        $this->assertNotSame('', trim($translated[$key]), $context);
        $this->assertTrue(mb_check_encoding($translated[$key], 'UTF-8'), $context);

        // Includes dotted activity placeholders such as :files.0.from.
        $placeholderPattern = '/:[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)*|\{\{[^}]+\}\}/';
        preg_match_all($placeholderPattern, $value, $sourceTokens);
        preg_match_all($placeholderPattern, $translated[$key], $translatedTokens);
        sort($sourceTokens[0]);
        sort($translatedTokens[0]);
        $this->assertSame($sourceTokens[0], $translatedTokens[0], $context);

        preg_match_all('/<[^>]+>/', $value, $sourceTags);
        preg_match_all('/<[^>]+>/', $translated[$key], $translatedTags);
        $this->assertSame($sourceTags[0], $translatedTags[0], $context);
    }
})->with(['fr', 'de'])->with(function () {
    foreach ((new Filesystem())->allFiles(dirname(__DIR__, 4) . '/resources/lang/en') as $file) {
        if ($file->getExtension() === 'php') {
            yield $file->getRelativePathname();
        }
    }
});

test('bundled languages are discovered with their native names', function () {
    $languages = new LanguageService(new Filesystem(), new ISO639());
    expect($languages->available()['fr'])->toBe(['name' => 'French', 'nativeName' => 'Français', 'direction' => 'ltr'])
        ->and($languages->available()['de'])->toBe(['name' => 'German', 'nativeName' => 'Deutsch', 'direction' => 'ltr']);
});

test('bundled languages respect browser regions and saved preferences', function (string $header, string $preference, string $expected) {
    $languages = new LanguageService(new Filesystem(), new ISO639());
    $request = Request::create('/');
    $request->headers->set('Accept-Language', $header);
    expect($languages->forRequest($request, $preference))->toBe($expected);
})->with([
    ['fr-CA,fr;q=0.9,en;q=0.8', 'auto', 'fr'],
    ['de-AT,de;q=0.9,en;q=0.8', 'auto', 'de'],
    ['de-CH,fr-FR;q=0.8', 'auto', 'de'],
    ['fr;q=0.3,de-DE;q=0.9,en;q=0.5', 'auto', 'de'],
    ['fr;q=0,de;q=0,en;q=1', 'auto', 'en'],
    ['de-DE,en;q=0.8', 'fr', 'fr'],
    ['fr-FR,en;q=0.8', 'de', 'de'],
    ['fr-FR,de-DE;q=0.8', 'en', 'en'],
]);
