<?php

use Pterodactyl\Models\User;
use Database\Seeders\BlueprintSeeder;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Validator;
use Pterodactyl\Models\ExtensionCachedMetadata;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Http\Controllers\Admin\ExtensionsController;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;
use Pterodactyl\BlueprintFramework\Controllers\ExtensionConfigurationController;
use Pterodactyl\Http\Controllers\Admin\Extensions\Blueprint\BlueprintAdminFormRequest;
use Pterodactyl\Http\Controllers\Admin\Extensions\Blueprint\BlueprintExtensionController;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Admin\BlueprintAdminLibrary;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set('pterodactyl.auth.2fa_required', 0);
    $this->actingAs(User::factory()->create(['root_admin' => true]));
    // These request classes share a file with their controllers in the legacy Blueprint API.
    class_exists(BlueprintExtensionController::class);
    class_exists(ExtensionConfigurationController::class);
    Route::get('/admin/coverage-addon', fn () => 'test extension')->name('admin.extensions.coverage-addon.index');
    Route::getRoutes()->refreshNameLookups();
});

test('Blueprint flags are validated persisted and metadata refreshed only when its setting changes', function () {
    $settings = app(SettingsRepositoryInterface::class);
    $settings->set('blueprint::flags:remote_metadata', '0');
    Artisan::shouldReceive('call')->once()->with('bp:meta')->andReturn(0);
    $this->patch('/admin/extensions/blueprint', ['flags:remote_metadata' => 1, 'flags:is_developer' => 1])->assertRedirect(route('admin.extensions'));
    expect($settings->get('blueprint::flags:remote_metadata'))->toBe('1')->and($settings->get('blueprint::flags:is_developer'))->toBe('1');
    $this->patch('/admin/extensions/blueprint', ['flags:remote_metadata' => 1])->assertRedirect();
});

test('Blueprint rejects invalid boolean flags before persisting them', function () {
    Artisan::shouldReceive('call')->never();
    $this->patch('/admin/extensions/blueprint', ['flags:remote_metadata' => 'yes'])->assertUnprocessable();
});

test('custom Blueprint flag schemas validate strings numeric values and integers', function () {
    $seeder = $this->mock(BlueprintSeeder::class);
    $seeder->shouldReceive('getSchema')->andReturn(['flags' => ['text' => ['type' => 'string'], 'decimal' => ['type' => 'number'], 'count' => ['type' => 'integer']]]);
    $rules = (new BlueprintAdminFormRequest())->rules();
    expect(Validator::make(['flags:text' => 'theme', 'flags:decimal' => 1.5, 'flags:count' => 2], $rules)->passes())->toBeTrue();
    expect(Validator::make(['flags:text' => [], 'flags:decimal' => 'bad', 'flags:count' => 1.5], $rules)->errors()->keys())->toBe(['flags:text', 'flags:decimal', 'flags:count']);
});

test('extension permissions persist selected eggs and drop the all-eggs marker when specific eggs are chosen', function (array $eggs, array $expected) {
    $this->patch('/admin/extensions/blueprint/config', ['_identifier' => 'coverage-addon', 'coverage-addon_adminlayouts' => 0, 'coverage-addon_dashboardwrapper' => 1, 'coverage-addon_eggs' => $eggs])->assertRedirect(route('admin.extensions.coverage-addon.index'));
    $settings = app(SettingsRepositoryInterface::class);
    expect(json_decode($settings->get('blueprint::extensionconfig_coverage-addon_eggs'), true))->toBe($expected);
    expect($settings->get('blueprint::extensionconfig_coverage-addon_adminlayouts'))->toBe('0');
})->with([[['-1', '2', '3'], ['2', '3']], [['-1'], ['-1']], [[], []]]);

test('extensions default to all eggs when no selection is submitted', function () {
    $this->patch('/admin/extensions/blueprint/config', ['_identifier' => 'coverage-addon'])->assertRedirect();
    expect(app(SettingsRepositoryInterface::class)->get('blueprint::extensionconfig_coverage-addon_eggs'))->toBe('["-1"]');
});

test('the extension overview includes only installed metadata and caches the latest version when missing', function (bool $cached) {
    $library = Mockery::mock(BlueprintAdminLibrary::class)->makePartial();
    $library->shouldReceive('extensions')->andReturn(['coverage-addon']);
    $this->app->instance(BlueprintAdminLibrary::class, $library);
    $library->dbSetMany('blueprint', ['internal:version:latest' => $cached ? '1.2.0' : false, 'flags:remote_metadata' => true, 'flags:is_developer' => false]);
    ExtensionCachedMetadata::query()->create(['identifier' => 'coverage-addon', 'metadata' => ['name' => 'Coverage addon']]);
    ExtensionCachedMetadata::query()->create(['identifier' => 'uninstalled', 'metadata' => ['name' => 'Not installed']]);
    if (!$cached) {
        Artisan::shouldReceive('call')->once()->with('bp:version:cache')->andReturnUsing(fn () => $library->dbSet('blueprint', 'internal:version:latest', '1.2.0'));
    }
    $data = app(ExtensionsController::class)->index()->getData();
    expect($data['latestBlueprintVersion'])->toBe('1.2.0')->and($data['metadata'])->toBe(['coverage-addon' => ['name' => 'Coverage addon']]);
    expect($data['defaults']['flags:is_developer'])->toBeFalse();
})->with([true, false]);
