<?php

use Pterodactyl\Http\ViewComposers\AssetComposer;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Admin\BlueprintAdminLibrary;

test('included views reuse public configuration within a scope and fresh scopes see updated settings', function () {
    $this->app->forgetScopedInstances();
    $this->mock(BlueprintAdminLibrary::class)->shouldReceive('dbGetMany')
        ->with('blueprint', ['flags:disable_attribution'])->twice()
        ->andReturn(['flags:disable_attribution' => false]);
    config(['app.name' => 'First request', 'aquadactyl.features.file_trash' => true]);
    $composer = app(AssetComposer::class);
    $first = view('templates.wrapper');
    $partial = view('partials.favicons');
    $composer->compose($first);
    app(AssetComposer::class)->compose($partial);

    expect(app(AssetComposer::class))->toBe($composer)
        ->and($partial->getData()['siteConfiguration'])->toBe($first->getData()['siteConfiguration']);

    $this->app->forgetScopedInstances();
    config(['app.name' => 'Second request', 'aquadactyl.features.file_trash' => false]);
    $fresh = app(AssetComposer::class);
    $second = view('templates.wrapper');
    $fresh->compose($second);
    expect($fresh)->not->toBe($composer)
        ->and($second->getData()['siteConfiguration']['name'])->toBe('Second request')
        ->and($second->getData()['siteConfiguration']['features']['fileTrash'])->toBeFalse();
});

test('configuration is refreshed when the current request changes even if a composer is retained', function () {
    $this->app->forgetScopedInstances();
    $this->mock(BlueprintAdminLibrary::class)->shouldReceive('dbGetMany')->twice()
        ->andReturn(['flags:disable_attribution' => false]);
    $composer = app(AssetComposer::class);
    $first = view('templates.wrapper');
    config(['app.name' => 'First viewer']);
    $composer->compose($first);

    $this->app->instance('request', Illuminate\Http\Request::create('/second-request'));
    config(['app.name' => 'Second viewer', 'aquadactyl.features.file_trash' => false]);
    $second = view('templates.wrapper');
    $composer->compose($second);
    expect($first->getData()['siteConfiguration']['name'])->toBe('First viewer')
        ->and($second->getData()['siteConfiguration']['name'])->toBe('Second viewer')
        ->and($second->getData()['siteConfiguration']['features']['fileTrash'])->toBeFalse();
});
