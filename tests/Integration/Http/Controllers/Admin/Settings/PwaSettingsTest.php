<?php

use Pterodactyl\Models\User;
use Pterodactyl\Services\Settings\PwaService;
use Pterodactyl\Providers\SettingsServiceProvider;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

uses(DatabaseTransactions::class);

beforeEach(function () {
    app()->instance(Illuminate\Contracts\Debug\ExceptionHandler::class, new class(app()) extends Pterodactyl\Exceptions\Handler {
        public function render($request, Throwable $e): Symfony\Component\HttpFoundation\Response
        {
            return (new ReflectionMethod(Illuminate\Foundation\Exceptions\Handler::class, 'render'))->invoke($this, $request, $e);
        }
    });
    config()->set(['pterodactyl.auth.2fa_required' => 0, 'pterodactyl.load_environment_only' => false, 'aquadactyl.setup.completed' => true,
        'aquadactyl.pwa' => ['enabled' => true, 'offline_enabled' => true, 'app_name' => '', 'short_name' => '']]);
    $this->admin = User::factory()->create(['root_admin' => true]);
    $this->actingAs($this->admin);
    $this->payload = ['enabled' => '1', 'offline_enabled' => '1', 'app_name' => 'My installed panel', 'short_name' => 'Panel'];
});

afterEach(function () {
    foreach (['enabled', 'offline_enabled', 'app_name', 'short_name'] as $key) {
        app(SettingsRepositoryInterface::class)->forget('settings::aquadactyl:pwa:' . $key);
    }
});

test('PWA administration is translated and uses a relative form action', function (string $locale) {
    $this->admin->update(['language' => $locale]);
    $this->get('/admin/settings/pwa')->assertOk()->assertSee('id="pwa-enabled"', false)
        ->assertSee('action="/admin/settings/pwa"', false)->assertDontSee('>pwa.', false);
})->with(['en', 'fr', 'de']);

test('saved PWA names reach the manifest without modifying site branding', function (string $name, string $short) {
    config()->set('app.name', 'Original site');
    $this->patch('/admin/settings/pwa', array_replace($this->payload, ['app_name' => $name, 'short_name' => $short]))
        ->assertRedirect('/admin/settings/pwa')->assertHeader('Location', '/admin/settings/pwa');
    app()->call([new SettingsServiceProvider(app()), 'boot']);
    $this->get('/branding/site/manifest.webmanifest')->assertOk()->assertJsonPath('name', $name)->assertJsonPath('short_name', $short);
    expect(config('app.name'))->toBe('Original site');
})->with([['My installed panel', 'Panel'], ['false', '0'], ['</script><img src=x onerror=alert(1)>', 'Safe " name']]);

test('disabling PWA removes metadata install controls and manifests and serves a retiring worker', function () {
    $this->patch('/admin/settings/pwa', array_replace($this->payload, ['enabled' => '0']))->assertRedirect('/admin/settings/pwa');
    app()->call([new SettingsServiceProvider(app()), 'boot']);
    expect(app(PwaService::class)->enabled())->toBeFalse()->and(app(PwaService::class)->offlineEnabled())->toBeFalse();
    $this->get('/')->assertOk()->assertDontSee('rel="manifest"', false)->assertDontSee('name="apple-mobile-web-app-capable"', false)
        ->assertSee('data-pwa-enabled="false"', false)->assertSee('data-pwa-offline="false"', false);
    $this->get('/admin/settings/setup?step=finish')->assertOk()->assertDontSee('data-pwa-install');
    foreach (['/branding/site/manifest.webmanifest', '/favicons/manifest.json', '/pwa/offline?lang=en'] as $path) {
        $this->get($path)->assertNotFound();
    }
    $this->get('/pwa/service-worker')->assertOk()->assertSee('self.registration.unregister()', false)->assertDontSee('cache.put(', false);
});

test('disabling offline support preserves app installation and reenabling restores the worker', function () {
    $this->patch('/admin/settings/pwa', array_replace($this->payload, ['offline_enabled' => '0']))->assertRedirect('/admin/settings/pwa');
    app()->call([new SettingsServiceProvider(app()), 'boot']);
    $this->get('/')->assertOk()->assertSee('rel="manifest"', false)->assertSee('data-pwa-offline="false"', false);
    $this->get('/branding/site/manifest.webmanifest')->assertOk();
    $this->get('/pwa/service-worker')->assertOk()->assertSee('self.registration.unregister()', false);
    $this->get('/pwa/offline')->assertNotFound();
    $this->patch('/admin/settings/pwa', $this->payload)->assertRedirect('/admin/settings/pwa');
    app()->call([new SettingsServiceProvider(app()), 'boot']);
    $this->get('/pwa/service-worker')->assertOk()->assertSee('cache.put(', false)->assertDontSee('self.registration.unregister()', false);
    $this->get('/pwa/offline')->assertOk();
});

test('empty names inherit appearance and short names remain bounded', function () {
    config()->set('app.name', str_repeat('a', 60));
    $this->patch('/admin/settings/pwa', ['enabled' => 1, 'offline_enabled' => 1])->assertRedirect('/admin/settings/pwa');
    app()->call([new SettingsServiceProvider(app()), 'boot']);
    $this->get('/branding/site/manifest.webmanifest')->assertOk()->assertJsonPath('name', str_repeat('a', 60))->assertJsonPath('short_name', str_repeat('a', 30));
    config()->set('aquadactyl.pwa.app_name', '0');
    expect(app(PwaService::class)->appName())->toBe('0');
});

test('PWA settings reject invalid payloads before changing any values', function (array $changes) {
    $this->patchJson('/admin/settings/pwa', array_replace($this->payload, $changes))->assertUnprocessable();
    $this->assertDatabaseMissing('settings', ['key' => 'settings::aquadactyl:pwa:enabled']);
})->with([[['enabled' => 'yes']], [['offline_enabled' => 'no']], [['short_name' => str_repeat('a', 31)]], [['app_name' => str_repeat('a', 192)]], [['app_name' => ['injected']]]]);

test('PWA settings require administrator access', function () {
    $this->actingAs(User::factory()->create());
    $this->get('/admin/settings/pwa')->assertForbidden();
    $this->patchJson('/admin/settings/pwa', $this->payload)->assertForbidden();
});

test('environment managed installations expose readonly PWA settings', function () {
    config()->set('pterodactyl.load_environment_only', true);
    $this->get('/admin/settings/pwa')->assertOk()->assertSee('disabled', false);
    $this->patchJson('/admin/settings/pwa', $this->payload)->assertStatus(400);
    $this->assertDatabaseMissing('settings', ['key' => 'settings::aquadactyl:pwa:enabled']);
});
