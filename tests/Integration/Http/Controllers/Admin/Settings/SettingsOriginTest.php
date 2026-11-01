<?php

use Pterodactyl\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Helpers\SoftwareVersionService;
use Pterodactyl\Services\Accounts\AccountSecuritySettings;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

uses(DatabaseTransactions::class);

beforeEach(function () {
    Storage::fake('public');
    config()->set('app.url', 'http://localhost:8081');
    config()->set('trustedproxy.proxies', []);
    config()->set('pterodactyl.auth.2fa_required', 0);
    config()->set('pterodactyl.load_environment_only', false);
    app('cache')->forever(SoftwareVersionService::VERSION_CACHE_KEY, ['panel' => '1.0.0', 'wings' => '1.0.0']);
    $this->admin = User::factory()->create(['root_admin' => true]);
    $this->actingAs($this->admin)->withHeaders([
        'X-Forwarded-Proto' => 'https', 'X-Forwarded-Host' => 'dev.example.test',
    ]);
});

test('settings forms and tabs preserve the browser origin behind an HTTP tunnel', function (string $tab) {
    $response = $this->get('http://dev.example.test/admin/settings' . $tab)->assertOk();
    preg_match_all('/<form\b[^>]*\saction="([^"]*)"/i', $response->getContent(), $actions);
    foreach ($actions[1] as $action) {
        expect($action === '' || (str_starts_with($action, '/') && !str_starts_with($action, '//')))->toBeTrue('Form action must remain on the browser origin: ' . $action);
    }
    $response->assertSee('href="/admin/settings"', false)->assertSee('href="/admin/settings/advanced"', false);
    if ($tab === '/mail') {
        preg_match_all('/url:("[^"]+")/', $response->getContent(), $ajaxUrls);
        expect(array_map(fn ($url) => json_decode($url), $ajaxUrls[1]))->toBe(['/admin/settings/mail', '/admin/settings/mail/test']);
    }
})->with(['', '/appearance', '/advanced', '/oauth', '/mail', '/logs']);

test('saving general settings returns a relative redirect and persists the submitted value', function (string $origin) {
    $this->patch($origin . '/admin/settings', ['app:locale' => 'de', 'pterodactyl:auth:2fa_required' => 0])
        ->assertRedirect()->assertHeader('Location', '/admin/settings');
    expect(app(SettingsRepositoryInterface::class)->get('settings::app:locale'))->toBe('de');
})->with(['http://dev.example.test', 'https://dev.example.test', 'http://localhost:8081']);

test('saving advanced settings preserves the external HTTPS origin without trusting client supplied proxy headers', function () {
    $this->patch('http://dev.example.test/admin/settings/advanced', [
        'recaptcha:enabled' => 'false', 'pterodactyl:guzzle:timeout' => 30,
        'pterodactyl:guzzle:connect_timeout' => 10, 'pterodactyl:client_features:allocations:enabled' => 'false',
    ])->assertRedirect()->assertHeader('Location', '/admin/settings/advanced');
    expect(Illuminate\Http\Request::getTrustedProxies())->toBe([]);
});

test('appearance settings redirect to the same browser origin after saving', function () {
    $this->patch('http://dev.example.test/admin/settings/appearance', [
        'primary_color' => '#a85cf4', 'login_layout' => 'split-right', 'login_logo_position' => 'opposite',
        'login_translucency' => 20, 'login_blur' => 8, 'login_overlay' => 45, 'client_blur' => 4, 'client_overlay' => 80,
    ])->assertRedirect()->assertHeader('Location', '/admin/settings/appearance');
    expect(app(SettingsRepositoryInterface::class)->get('settings::aquadactyl:appearance:primary_color'))->toBe('#a85cf4');
});

test('appearance image uploads and removals preserve the external origin', function (string $endpoint, string $field, string $method) {
    $payload = $method === 'POST' ? [$field => UploadedFile::fake()->image('origin-test.png')] : [];
    $this->call($method, 'http://dev.example.test/admin/settings/' . $endpoint, $payload)
        ->assertRedirect()->assertHeader('Location', '/admin/settings/appearance');
})->with([
    ['logo', 'logo', 'POST'], ['logo', 'logo', 'DELETE'],
    ['appearance/background/login', 'background', 'POST'], ['appearance/background/login', 'background', 'DELETE'],
    ['appearance/background/client', 'background', 'POST'], ['appearance/background/client', 'background', 'DELETE'],
]);

test('saving OAuth settings retains the HTTPS browser origin', function () {
    $this->admin->forceFill(['password' => Hash::make('OriginTesting123!')])->save();
    $providers = array_fill_keys(array_keys(AccountSecuritySettings::PROVIDERS), ['enabled' => '0', 'client_id' => '', 'client_secret' => '']);
    $this->patch('http://dev.example.test/admin/settings/oauth', [
        'current_password' => 'OriginTesting123!', 'passkeys_enabled' => '0', 'providers' => $providers,
    ])->assertRedirect()->assertHeader('Location', '/admin/settings/oauth');
});

test('log actions redirect within the settings origin even when the selected file is missing', function (string $method, string $path) {
    $this->call($method, 'http://dev.example.test/admin/settings/logs/' . $path)
        ->assertRedirect()->assertHeader('Location', '/admin/settings/logs');
})->with([['GET', 'download/missing-origin-test.log'], ['DELETE', 'missing-origin-test.log']]);

test('settings validation failures return to the browsers HTTPS referer', function () {
    $this->withHeaders([
        'Accept' => 'text/html',
        'Referer' => 'https://dev.example.test/admin/settings',
    ])
        ->patch('http://dev.example.test/admin/settings', ['app:locale' => 'invalid', 'pterodactyl:auth:2fa_required' => 0])
        ->assertRedirect('https://dev.example.test/admin/settings')->assertSessionHasErrors('app:locale');
});
