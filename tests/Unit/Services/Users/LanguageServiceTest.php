<?php

use Mockery as m;
use Illuminate\Http\Request;
use Illuminate\Filesystem\Filesystem;
use Pterodactyl\Services\Users\LanguageService;

beforeEach(function () {
    $this->files = m::mock(Filesystem::class);
    $this->files->shouldReceive('directories')->with(resource_path('lang'))->once()->andReturn([
        resource_path('lang/en'), resource_path('lang/fr'), resource_path('lang/pt_BR'),
        resource_path('lang/zh-Hant'), resource_path('lang/ar'), resource_path('lang/invalid.name'),
    ]);
    $this->files->shouldReceive('exists')->andReturnUsing(fn (string $path) => str_ends_with($path, '/ar/locale.json'));
    $this->files->shouldReceive('get')->andReturn('{"name":"Arabic","nativeName":"العربية","direction":"rtl"}');
    $this->languages = new LanguageService($this->files);
});

test('automatic selection respects preference order and regional language tags', function (?string $preference, array $browser, string $expected) {
    expect($this->languages->resolve($preference, $browser))->toBe($expected);
})->with([
    [null, ['fr-CA', 'en'], 'fr'],
    ['auto', ['de-DE', 'fr-FR', 'en'], 'fr'],
    ['auto', ['pt-BR', 'en'], 'pt_BR'],
    ['auto', ['pt', 'en'], 'pt_BR'],
    ['auto', ['zh-Hant-TW', 'zh', 'en'], 'zh-Hant'],
    ['auto', ['EN-us'], 'en'],
    ['auto', ['de', '*'], 'en'],
    ['auto', [], 'en'],
    ['en', ['fr'], 'en'],
    ['fr', ['en'], 'fr'],
    ['removed-pack', ['fr'], 'en'],
]);

test('installed packs expose safe display metadata and regional names', function () {
    $languages = $this->languages->available();
    expect($languages)->toHaveKeys(['en', 'fr', 'pt_BR', 'zh-Hant', 'ar'])
        ->not->toHaveKey('invalid.name')
        ->and($languages['ar'])->toBe(['name' => 'Arabic', 'nativeName' => 'العربية', 'direction' => 'rtl'])
        ->and($languages['pt_BR']['name'])->not->toBeEmpty();
});

test('locale selection defers display metadata while preserving the later language list', function () {
    $this->languages->available();
    $files = m::mock(Filesystem::class);
    $files->expects('directories')->once()->with(resource_path('lang'))->andReturn([
        resource_path('lang/fr'), resource_path('lang/en'), resource_path('lang/auto'),
        resource_path('lang/invalid.name'), resource_path('lang/' . str_repeat('x', 36)),
    ]);
    $files->expects('exists')->twice()->andReturn(true);
    $files->expects('get')->twice()->andReturn('{"name":"Custom name","nativeName":"Custom native name","direction":"rtl"}');
    $languages = new LanguageService($files);
    expect($languages->resolve('fr'))->toBe('fr')
        ->and($languages->resolve('auto', ['fr-CA']))->toBe('fr')
        ->and($languages->fallback())->toBe('en');
    // The two metadata reads above must occur only here, once per installed pack.
    $list = $languages->available();
    expect(array_keys($list))->toBe(['en', 'fr'])
        ->and($list['fr'])->toBe(['name' => 'Custom name', 'nativeName' => 'Custom native name', 'direction' => 'rtl'])
        ->and($languages->available())->toBe($list);
});

test('resolving requests never reads locale metadata', function () {
    $this->languages->available();
    $files = m::mock(Filesystem::class);
    $files->expects('directories')->once()->andReturn([resource_path('lang/en'), resource_path('lang/fr')]);
    $files->shouldNotReceive('exists', 'get');
    $languages = new LanguageService($files);
    $request = Request::create('/', 'GET', server: ['HTTP_ACCEPT_LANGUAGE' => 'fr;q=1,en;q=0.5']);
    expect($languages->forRequest($request, 'en'))->toBe('en')
        ->and($languages->forRequest($request, 'missing'))->toBe('en')
        ->and($languages->forRequest($request, 'auto'))->toBe('fr')
        ->and($languages->forRequest($request, null))->toBe('fr');
});

test('a request locale cannot become the site default for another viewer', function () {
    expect($this->languages->resolve('fr'))->toBe('fr');
    $this->app->setLocale('fr');
    expect($this->languages->resolve('auto', ['de']))->toBe('en');
});

test('unknown site defaults safely fall back to an installed language', function () {
    config()->set('app.locale', 'missing');
    config()->set('app.fallback_locale', 'missing');
    $languages = new LanguageService($this->files);
    expect($languages->resolve('auto', []))->toBe('en');
});

test('automatic selection honors header weights and excludes refused languages', function (string $header, string $expected) {
    $request = Request::create('/');
    $request->headers->set('Accept-Language', $header);
    expect($this->languages->forRequest($request, 'auto'))->toBe($expected);
})->with([
    ['fr;q=0.3,pt-BR;q=0.8,en;q=0.5', 'pt_BR'],
    ['fr;q=0,de;q=1', 'en'],
    ['fr;q=0,*;q=0', 'en'],
]);

test('installations without English choose an installed fallback and empty pack lists remain usable', function (bool $installed, string $expected) {
    $this->languages->available();
    config()->set('app.locale', 'missing');
    config()->set('app.fallback_locale', 'missing');
    $files = m::mock(Filesystem::class);
    $files->expects('directories')->andReturn($installed ? [resource_path('lang/fr')] : []);
    $files->allows('exists')->andReturn(false);
    expect((new LanguageService($files))->fallback())->toBe($expected);
})->with([[true, 'fr'], [false, 'en']]);
