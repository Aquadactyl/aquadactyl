<?php

use Pterodactyl\Models\User;

test('blur is disabled by default and can be enabled and disabled', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->getJson('/api/client/account')->assertOk()->assertJsonPath('attributes.blur_sensitive_data', false);
    $this->putJson('/api/client/account/privacy', ['blur_sensitive_data' => true])
        ->assertOk()->assertJsonPath('attributes.blur_sensitive_data', true);
    expect($user->refresh()->blur_sensitive_data)->toBeTrue();
    $this->assertActivityFor('user:account.privacy-updated', $user, $user);
    $this->getJson('/api/client/account')->assertOk()->assertJsonPath('attributes.blur_sensitive_data', true);
    $this->putJson('/api/client/account/privacy', ['blur_sensitive_data' => false])
        ->assertOk()->assertJsonPath('attributes.blur_sensitive_data', false);
    expect($user->refresh()->blur_sensitive_data)->toBeFalse();
});

test('the update only changes the authenticated users privacy preference', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $originalPassword = $user->password;
    $originalEmail = $user->email;
    $this->actingAs($user)->putJson('/api/client/account/privacy', [
        'blur_sensitive_data' => true,
        'user_id' => $other->id,
        'email' => 'other@example.com',
        'password' => 'overridden-password',
        'root_admin' => true,
    ])->assertOk();
    expect($user->refresh()->blur_sensitive_data)->toBeTrue()
        ->and($other->refresh()->blur_sensitive_data)->toBeFalse()
        ->and($user->root_admin)->toBeFalse()
        ->and($user->password)->toBe($originalPassword)
        ->and($user->email)->toBe($originalEmail);
});

test('invalid preferences are rejected without changing the saved value', function () {
    $user = User::factory()->create();
    $this->actingAs($user);
    foreach ([[], ['blur_sensitive_data' => 'yes'], ['blur_sensitive_data' => null], ['blur_sensitive_data' => []]] as $payload) {
        $this->putJson('/api/client/account/privacy', $payload)->assertUnprocessable();
        expect($user->refresh()->blur_sensitive_data)->toBeFalse();
    }
});

test('unauthenticated users cannot change preferences', function () {
    $this->putJson('/api/client/account/privacy', ['blur_sensitive_data' => true])->assertUnauthorized();
});

test('both layouts apply the viewers preference before rendering', function () {
    if (!defined('LARAVEL_START')) {
        define('LARAVEL_START', microtime(true));
    }
    $admin = User::factory()->create(['root_admin' => true]);
    $admin->forceFill(['blur_sensitive_data' => true])->save();
    $other = User::factory()->create();
    $this->actingAs($admin)->get('/account')->assertOk()->assertSee('<html class="privacy-mode">', false);
    $this->get('/admin/users')->assertOk()->assertSee('<html class="privacy-mode">', false);
    $this->actingAs($other)->get('/account')->assertOk()->assertSee('<html class="">', false);
});
