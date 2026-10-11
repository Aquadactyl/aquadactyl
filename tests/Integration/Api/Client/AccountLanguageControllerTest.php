<?php

use Mockery as m;
use Matriphe\ISO639\ISO639;
use Pterodactyl\Models\User;
use Illuminate\Filesystem\Filesystem;
use Pterodactyl\Services\Users\LanguageService;

beforeEach(function () {
    // Simulate an installed regional pack without modifying repository files.
    $files = m::mock(Filesystem::class);
    $files->shouldReceive('directories')->andReturn([resource_path('lang/en'), resource_path('lang/fr-CA')]);
    $files->shouldReceive('exists')->andReturnFalse();
    $this->app->instance(LanguageService::class, new LanguageService($files, new ISO639()));
});

test('users can save explicit and automatic preferences across requests', function () {
    $user = User::factory()->create();
    expect($user->language)->toBe('auto');
    $this->actingAs($user)->withHeader('Accept-Language', 'fr-CA,fr;q=0.9,en;q=0.8')
        ->putJson('/api/client/account/language', ['language' => 'en'])
        ->assertOk()->assertJson(['language' => 'en', 'locale' => 'en']);
    expect($user->refresh()->language)->toBe('en');
    $this->getJson('/api/client/account')->assertOk()->assertJsonPath('attributes.language', 'en');

    $this->putJson('/api/client/account/language', ['language' => 'auto'])
        ->assertOk()->assertJson(['language' => 'auto', 'locale' => 'fr-CA']);
    expect($user->refresh()->language)->toBe('auto');
    $this->getJson('/api/client/account')->assertOk()->assertJsonPath('attributes.language', 'auto');

    $this->putJson('/api/client/account/language', ['language' => 'fr-CA'])
        ->assertOk()->assertJson(['language' => 'fr-CA', 'locale' => 'fr-CA']);
    expect($user->refresh()->language)->toBe('fr-CA');
});

test('the language update changes only the authenticated accounts preference', function () {
    $user = User::factory()->create(['language' => 'en']);
    $other = User::factory()->create(['language' => 'en']);
    $originalPassword = $user->password;
    $this->actingAs($user)->putJson('/api/client/account/language', [
        'language' => 'fr-CA', 'user_id' => $other->id,
        'email' => 'changed@example.com', 'root_admin' => true, 'password' => 'changed',
    ])->assertOk();
    expect($user->refresh()->language)->toBe('fr-CA')
        ->and($other->refresh()->language)->toBe('en')
        ->and($user->root_admin)->toBeFalse()
        ->and($user->password)->toBe($originalPassword);
});

test('invalid or uninstalled preferences are rejected', function (mixed $value) {
    $user = User::factory()->create(['language' => 'en']);
    $this->actingAs($user)->putJson('/api/client/account/language', ['language' => $value])->assertUnprocessable();
    expect($user->refresh()->language)->toBe('en');
})->with(['missing', '../en', '', null, ['en'], 'de', '<script>']);

test('language changes require authentication', function () {
    $this->putJson('/api/client/account/language', ['language' => 'en'])->assertUnauthorized();
});

test('browser preferences resolve consistently in the client and admin layouts', function () {
    if (!defined('LARAVEL_START')) {
        define('LARAVEL_START', microtime(true));
    }
    $admin = User::factory()->create(['root_admin' => true, 'language' => 'auto']);
    $this->actingAs($admin)->withHeader('Accept-Language', 'fr-CA,en;q=0.5')
        ->get('/account')->assertOk()->assertSee('lang="fr-CA"', false)->assertSee('window.PanelLocalization', false);
    $this->get('/admin/users')->assertOk()->assertSee('lang="fr-CA"', false);
    $other = User::factory()->create(['language' => 'en']);
    $this->actingAs($other)->get('/account')->assertOk()->assertSee('lang="en"', false);
});
