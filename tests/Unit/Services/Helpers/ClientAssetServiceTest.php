<?php

use Illuminate\Foundation\Vite;
use Illuminate\Filesystem\Filesystem;
use Pterodactyl\Services\Helpers\ClientAssetService;

test('initial route preloads follow static imports once and leave dynamic routes lazy', function (string $path, string $router) {
    $key = 'resources/scripts/routers/' . $router . '.tsx';
    $files = Mockery::mock(Filesystem::class);
    $files->expects('exists')->with(public_path('build/manifest.json'))->andReturn(true);
    $files->expects('get')->andReturn(json_encode([
        $key => ['imports' => ['_shared.js', '_shared.js', '_missing.js'], 'dynamicImports' => ['other-route']],
        '_shared.js' => ['imports' => [$key]],
        'other-route' => ['file' => 'other.js'],
    ]));
    $vite = Mockery::mock(Vite::class);
    $vite->expects('isRunningHot')->andReturn(false);
    $vite->expects('asset')->with($key)->andReturn('/build/route.js');
    $vite->expects('asset')->with('_shared.js')->andReturn('/build/shared.js');

    expect((new ClientAssetService($files, $vite))->preloads($path))->toBe(['/build/route.js', '/build/shared.js']);
})->with([['', 'DashboardRouter'], ['account/api', 'DashboardRouter'], ['auth/login', 'AuthenticationRouter'], ['server/example/files', 'ServerRouter']]);

test('development and absent manifests do not emit production hints', function (bool $hot) {
    $files = Mockery::mock(Filesystem::class);
    if (!$hot) {
        $files->expects('exists')->andReturn(false);
    }
    $vite = Mockery::mock(Vite::class);
    $vite->expects('isRunningHot')->andReturn($hot);
    expect((new ClientAssetService($files, $vite))->preloads(''))->toBe([]);
})->with([true, false]);

test('incomplete or null manifests leave the normal entry loader in control', function (string $contents) {
    $files = Mockery::mock(Filesystem::class);
    $files->expects('exists')->andReturn(true);
    $files->expects('get')->andReturn($contents);
    $vite = Mockery::mock(Vite::class);
    $vite->expects('isRunningHot')->andReturn(false);
    expect((new ClientAssetService($files, $vite))->preloads(''))->toBe([]);
})->with(['null', '{}']);
