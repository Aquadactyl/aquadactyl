<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Pterodactyl\Models\ExtensionCachedMetadata;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\BlueprintBaseLibrary;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Admin\BlueprintAdminLibrary;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Client\BlueprintClientLibrary;

require_once __DIR__ . '/../../Fixtures/RuntimeFaults.php';

uses(DatabaseTransactions::class);

beforeEach(function () {
    $this->blueprint = new BlueprintBaseLibrary();
    $this->extensionsPath = base_path('.blueprint/extensions/blueprint/private/db/installed_extensions');
    $this->extensionsBefore = File::exists($this->extensionsPath) ? File::get($this->extensionsPath) : null;
    File::ensureDirectoryExists(dirname($this->extensionsPath));
    File::put($this->extensionsPath, '|coverage-addon,|invalid-addon,');
    $this->fixture = base_path('.blueprint/extensions/coverage-addon');
    $this->invalidFixture = base_path('.blueprint/extensions/invalid-addon');
    File::ensureDirectoryExists($this->fixture . '/private/.store');
    File::ensureDirectoryExists($this->invalidFixture . '/private/.store');
    File::put($this->fixture . '/private/.store/conf.yml', "info:\n  name: Coverage addon\n  version: 1.2.3\nempty: null\n");
    File::put($this->invalidFixture . '/private/.store/conf.yml', 'invalid: [');
});

afterEach(function () {
    Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled = [];
    File::deleteDirectory($this->fixture);
    File::deleteDirectory($this->invalidFixture);
    if ($this->extensionsBefore === null) {
        File::delete($this->extensionsPath);
    } else {
        File::put($this->extensionsPath, $this->extensionsBefore);
    }
});

test('legacy file reads return an empty value when the extension cannot read the file', function () {
    $path = $this->fixture . '/unreadable.txt';
    File::put($path, 'private content');
    Pterodactyl\Tests\Fixtures\RuntimeFaults::$enabled['blueprint.unreadable'][$path] = true;
    expect($this->blueprint->fileRead($path))->toBe('');
});

test('extension settings support bulk round trips defaults updates and namespace isolation', function () {
    $bp = $this->blueprint;
    $bp->dbSetMany('coverage', ['boolean' => false, 'array' => ['one', 'two'], 'number' => 12]);
    $bp->dbSet('other', 'number', 99);
    expect($bp->dbGet('coverage', 'missing', 'fallback'))->toBe('fallback')
        ->and($bp->dbGet('coverage', 'boolean'))->toBeFalse()
        ->and($bp->dbGetMany('coverage', ['number', 'missing'], 'fallback'))->toBe(['number' => 12, 'missing' => 'fallback']);
    expect($bp->dbGetMany('coverage'))->toEqual(['boolean' => false, 'array' => ['one', 'two'], 'number' => 12]);
    $bp->dbSetMany('coverage', ['number' => 13]);
    expect($bp->dbGet('coverage', 'number'))->toBe(13);
    expect($bp->dbForget('coverage', 'boolean'))->toBeTrue()
        ->and($bp->dbForget('coverage', 'boolean'))->toBeFalse()
        ->and($bp->dbForgetMany('coverage', ['number', 'missing']))->toBeTrue()
        ->and($bp->dbForgetAll('coverage'))->toBeTrue()
        ->and($bp->dbGetMany('coverage'))->toBe([])
        ->and($bp->dbGet('other', 'number'))->toBe(99);
});

test('plain and malformed serialized settings remain readable without instantiating PHP objects', function () {
    foreach (['plain' => 'normal setting', 'malformed' => 'a:2:{invalid', 'boolean' => 'b:0;'] as $key => $value) {
        DB::table('settings')->insert(['key' => 'coverage-format::' . $key, 'value' => $value]);
    }
    expect($this->blueprint->dbGet('coverage-format', 'malformed'))->toBe('a:2:{invalid')
        ->and($this->blueprint->dbGetMany('coverage-format'))->toEqual(['plain' => 'normal setting', 'malformed' => 'a:2:{invalid', 'boolean' => false]);
});

test('extension settings fall back when database access fails', function () {
    DB::shouldReceive('table')->with('settings')->andThrow(new RuntimeException('database unavailable'));
    expect($this->blueprint->dbGet('coverage', 'value', false))->toBeFalse()
        ->and($this->blueprint->dbGetMany('coverage', ['first', 'second'], 'fallback'))->toBe(['first' => 'fallback', 'second' => 'fallback'])
        ->and($this->blueprint->dbGetMany('coverage'))->toBe([]);
});

test('legacy file helpers create read and recursively remove only the fixture', function () {
    $path = $this->fixture . '/legacy';
    File::ensureDirectoryExists($path . '/nested');
    $this->blueprint->fileMake($path . '/empty');
    File::put($path . '/nested/contents', 'Extension contents');
    expect($this->blueprint->fileRead($path . '/empty'))->toBe('')
        ->and($this->blueprint->fileRead($path . '/nested/contents'))->toBe('Extension contents')
        ->and($this->blueprint->fileRead($path . '/missing'))->toBe('')
        ->and($this->blueprint->fileWipe($path))->toBeTrue()
        ->and(File::exists($path))->toBeFalse()
        ->and($this->blueprint->fileWipe($path))->toBeFalse();
});

test('installed extension configuration omits empty keys and malformed configurations', function () {
    expect($this->blueprint->extension('coverage-addon'))->toBeTrue()
        ->and($this->blueprint->extension('coverage'))->toBeFalse()
        ->and($this->blueprint->extensionConfig('missing'))->toBeNull()
        ->and($this->blueprint->extensionConfig('coverage-addon'))->toBe(['info' => ['name' => 'Coverage addon', 'version' => '1.2.3']])
        ->and($this->blueprint->extensionsConfigs()->all())->toBe([['info' => ['name' => 'Coverage addon', 'version' => '1.2.3']]]);
});

test('extension metadata is available only when enabled and installed', function () {
    ExtensionCachedMetadata::query()->create(['identifier' => 'coverage-addon', 'metadata' => ['latest_version' => '2.0.0'], 'fetched_at' => now()]);
    expect(ExtensionCachedMetadata::latestVersionFor('missing'))->toBeNull()
        ->and(ExtensionCachedMetadata::latestVersionFor('coverage-addon'))->toBe('2.0.0')
        ->and($this->blueprint->extensionMetadata('coverage-addon'))->toBeNull();
    $this->blueprint->dbSet('blueprint', 'flags:remote_metadata', true);
    expect($this->blueprint->extensionMetadata('coverage-addon'))->toBe(['latest_version' => '2.0.0'])
        ->and($this->blueprint->extensionMetadata('invalid-addon'))->toBeNull()
        ->and($this->blueprint->extensionMetadata('missing'))->toBeNull();
});

test('admin and client asset imports share the Blueprint cache version', function (string $library) {
    $this->blueprint->dbSet('blueprint', 'internal:cache', 123);
    $instance = new $library();
    expect($instance->importStylesheet('/extensions/addon.css'))->toBe('<link rel="stylesheet" href="/extensions/addon.css?v=123">')
        ->and($instance->importScript('/extensions/addon.js'))->toBe('<script src="/extensions/addon.js?v=123"></script>');
})->with([BlueprintAdminLibrary::class, BlueprintClientLibrary::class]);

test('Blueprint admin alerts use the requested severity and legacy notifications remain supported', function (string $severity) {
    $admin = new BlueprintAdminLibrary();
    $admin->alert($severity, 'Extension status');
    expect(app(Prologue\Alerts\AlertsMessageBag::class)->get(in_array($severity, ['success', 'warning', 'danger']) ? $severity : 'info'))->toContain('Extension status');
    $admin->notify('Legacy status');
    expect(app(Prologue\Alerts\AlertsMessageBag::class)->get('info'))->toContain('Legacy status');
    $admin->notifyAfter(1, 'Ignored legacy notification');
    $admin->notifyNow('Ignored legacy notification');
    expect(app(Prologue\Alerts\AlertsMessageBag::class)->get('info'))->not->toContain('Ignored legacy notification');
})->with(['success', 'warning', 'danger', 'info', 'unknown']);

test('metadata refresh updates installed extensions and discards stale rows', function () {
    $this->blueprint->dbSet('blueprint', 'flags:remote_metadata', true);
    ExtensionCachedMetadata::query()->create(['identifier' => 'stale-addon', 'metadata' => ['latest_version' => 'old'], 'fetched_at' => now()]);
    Http::fake(['*' => Http::response(['coverage-addon' => '2.0.0', 'invalid-addon' => [], 'uninstalled' => '1.0.0'])]);
    $this->artisan('bp:meta')->expectsOutput('updated extension cached metadata')->assertExitCode(0);
    expect(ExtensionCachedMetadata::latestVersionFor('coverage-addon'))->toBe('2.0.0')
        ->and(ExtensionCachedMetadata::latestVersionFor('stale-addon'))->toBeNull();
    expect($this->blueprint->extensionMetadata('coverage-addon'))->toBe(['latest_version' => '2.0.0', 'local_version' => '1.2.3']);
});

test('metadata refresh retains previous rows when disabled or upstream data is unusable', function (bool $enabled, string $body, string $message) {
    $this->blueprint->dbSet('blueprint', 'flags:remote_metadata', $enabled);
    ExtensionCachedMetadata::query()->create(['identifier' => 'coverage-addon', 'metadata' => ['latest_version' => 'previous'], 'fetched_at' => now()]);
    Http::fake(['*' => Http::response($body)]);
    $this->artisan('bp:meta')->expectsOutput($message)->assertExitCode(0);
    expect(ExtensionCachedMetadata::latestVersionFor('coverage-addon'))->toBe('previous');
    if (!$enabled) {
        Http::assertNothingSent();
    }
})->with([
    [false, '{}', 'remote_metadata flag set to false'],
    [true, '', 'failed to fetch extension versions'],
    [true, '{', 'failed to fetch extension versions'],
    [true, '{}', 'no relevant data available, do you have any extensions installed?'],
]);

test('Blueprint release cache handles a valid release empty bodies and missing names', function (string $body, string $expected) {
    Http::fake(['*' => Http::response($body)]);
    $this->artisan('bp:version:cache')->assertExitCode($expected === 'unknown' ? 1 : 0);
    expect($this->blueprint->dbGet('blueprint', 'internal:version:latest'))->toBe($expected);
})->with([['{"name":"beta-test"}', 'beta-test'], ['', 'unknown'], ['{}', 'unknown']]);
