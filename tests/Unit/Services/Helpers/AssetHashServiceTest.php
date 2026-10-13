<?php

use Illuminate\Filesystem\FilesystemManager;
use Illuminate\Contracts\Filesystem\Filesystem;
use Pterodactyl\Services\Helpers\AssetHashService;

beforeEach(function () {
    (new ReflectionProperty(AssetHashService::class, 'manifest'))->setValue(null, null);
});
afterEach(function () {
    (new ReflectionProperty(AssetHashService::class, 'manifest'))->setValue(null, null);
});

test('asset hashes rewrite manifest entries, retain unknown assets and cache reads', function (bool $useHash) {
    config()->set('pterodactyl.assets.use_hash', $useHash);
    $disk = Mockery::mock(Filesystem::class);
    $disk->shouldReceive('exists')->once()->with(AssetHashService::MANIFEST_PATH)->andReturn(true);
    $disk->shouldReceive('get')->once()->with(AssetHashService::MANIFEST_PATH)->andReturn('{"app.js":{"src":"app.123.js","integrity":"sha384-test"},"app.css":{"src":"app.123.css","integrity":"sha384-css"}}');
    $manager = Mockery::mock(FilesystemManager::class);
    $manager->shouldReceive('createLocalDriver')->once()->with(['root' => public_path()])->andReturn($disk);
    $service = new AssetHashService($manager);
    expect($service->url('/assets/app.js'))->toBe('/assets/app.123.js')
        ->and($service->url('/assets/unknown.js'))->toBe('/assets/unknown.js')
        ->and($service->integrity('/assets/app.js'))->toBe('sha384-test')
        ->and($service->integrity('/assets/unknown.js'))->toBe('');
    $css = $service->css('/assets/app.css');
    $js = $service->js('/assets/app.js');
    expect($css)->toContain('href="/assets/app.123.css"', 'as="style"', 'crossorigin="anonymous"')
        ->and($js)->toContain('src="/assets/app.123.js"', '</script>');
    if ($useHash) {
        expect($css)->toContain('integrity="sha384-css"')->and($js)->toContain('integrity="sha384-test"');
    } else {
        expect($css)->not->toContain('integrity=')->and($js)->not->toContain('integrity=');
    }
})->with([true, false]);

test('missing and null manifests leave asset paths usable', function (bool $exists) {
    $disk = Mockery::mock(Filesystem::class);
    $disk->shouldReceive('exists')->once()->andReturn($exists);
    if ($exists) {
        $disk->shouldReceive('get')->once()->andReturn('null');
    }
    $manager = Mockery::mock(FilesystemManager::class);
    $manager->shouldReceive('createLocalDriver')->andReturn($disk);
    $service = new AssetHashService($manager);
    expect($service->url('/assets/app.js'))->toBe('/assets/app.js')
        ->and($service->integrity('/assets/app.js'))->toBe('');
})->with([true, false]);
