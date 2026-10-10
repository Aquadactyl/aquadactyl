<?php

use Pterodactyl\Models\User;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

beforeEach(function () {
    $this->admin = User::factory()->create(['root_admin' => true]);
});

test('non-admin cannot access or update advanced settings', function () {
    $user = User::factory()->create(['root_admin' => false]);

    $this->actingAs($user)->get(route('admin.settings.advanced'))->assertForbidden();
    $this->actingAs($user)->patch(route('admin.settings.advanced'), [])->assertForbidden();
});

test('admin can view advanced settings page', function () {
    $this->actingAs($this->admin)->get(route('admin.settings.advanced'))->assertOk();
});

test('saving advanced settings with disabled captcha succeeds', function () {
    $settingsRepo = app(SettingsRepositoryInterface::class);
    $settingsRepo->set('settings::recaptcha:enabled', 'true');
    $settingsRepo->set('settings::recaptcha:provider', 'recaptcha');

    $response = $this->actingAs($this->admin)->patch(route('admin.settings.advanced'), [
        'recaptcha:enabled' => 'false',
        'recaptcha:provider' => 'disabled',
        'recaptcha:website_key' => '6LfJlOctAAAAACPih0cdoSJpkSfGV_XfZq2Q6CX-',
        'recaptcha:secret_key' => '6LfJlOctAAAAAFthTgmw4-KBdP1liJQsKglZ6QGs',
        'pterodactyl:guzzle:timeout' => 30,
        'pterodactyl:guzzle:connect_timeout' => 10,
        'pterodactyl:client_features:allocations:enabled' => 'false',
    ]);

    $response->assertRedirect(route('admin.settings.advanced'));
    $response->assertSessionHasNoErrors();

    $this->assertDatabaseHas('settings', [
        'key' => 'settings::recaptcha:enabled',
        'value' => 'false',
    ]);

    // Provider should not be saved as 'disabled'
    $this->assertDatabaseMissing('settings', [
        'key' => 'settings::recaptcha:provider',
        'value' => 'disabled',
    ]);
});

test('submitting provider as disabled without hidden enabled flag automatically disables captcha', function () {
    $response = $this->actingAs($this->admin)->patch(route('admin.settings.advanced'), [
        'recaptcha:provider' => 'disabled',
        'recaptcha:website_key' => '',
        'recaptcha:secret_key' => '',
        'pterodactyl:guzzle:timeout' => 30,
        'pterodactyl:guzzle:connect_timeout' => 10,
        'pterodactyl:client_features:allocations:enabled' => 'false',
    ]);

    $response->assertRedirect(route('admin.settings.advanced'));
    $response->assertSessionHasNoErrors();

    $this->assertDatabaseHas('settings', [
        'key' => 'settings::recaptcha:enabled',
        'value' => 'false',
    ]);
});

test('saving advanced settings with enabled provider persists correctly', function () {
    foreach (['recaptcha', 'hcaptcha', 'turnstile'] as $provider) {
        $response = $this->actingAs($this->admin)->patch(route('admin.settings.advanced'), [
            'recaptcha:enabled' => 'true',
            'recaptcha:provider' => $provider,
            'recaptcha:website_key' => 'test-site-key',
            'recaptcha:secret_key' => 'test-secret-key',
            'pterodactyl:guzzle:timeout' => 30,
            'pterodactyl:guzzle:connect_timeout' => 10,
            'pterodactyl:client_features:allocations:enabled' => 'false',
        ]);

        $response->assertRedirect(route('admin.settings.advanced'));
        $response->assertSessionHasNoErrors();

        $this->assertDatabaseHas('settings', [
            'key' => 'settings::recaptcha:enabled',
            'value' => 'true',
        ]);
        $this->assertDatabaseHas('settings', [
            'key' => 'settings::recaptcha:provider',
            'value' => $provider,
        ]);
    }
});

test('saving advanced settings rejects invalid provider when enabled', function () {
    $response = $this->actingAs($this->admin)->patch(route('admin.settings.advanced'), [
        'recaptcha:enabled' => 'true',
        'recaptcha:provider' => 'unknown-provider',
        'recaptcha:website_key' => 'test-site-key',
        'recaptcha:secret_key' => 'test-secret-key',
        'pterodactyl:guzzle:timeout' => 30,
        'pterodactyl:guzzle:connect_timeout' => 10,
        'pterodactyl:client_features:allocations:enabled' => 'false',
    ]);

    $response->assertUnprocessable()
        ->assertJsonPath('errors.0.meta.source_field', 'recaptcha:provider');
});
