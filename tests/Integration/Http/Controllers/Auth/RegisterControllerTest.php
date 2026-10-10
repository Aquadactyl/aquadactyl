<?php

use Pterodactyl\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Pterodactyl\Events\Auth\DirectLogin;

beforeEach(function () {
    Event::fake([DirectLogin::class]);
});

test('registration is forbidden when self account creation is disabled', function () {
    config()->set('aquadactyl.features.registration', false);

    $this->postJson(route('auth.post.register'), [
        'username' => 'testuser',
        'email' => 'test@example.com',
        'name_first' => 'Test',
        'name_last' => 'User',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ])->assertForbidden();

    $this->assertDatabaseMissing('users', ['username' => 'testuser']);
});

test('user can register when self account creation is enabled', function () {
    config()->set('aquadactyl.features.registration', true);

    $response = $this->postJson(route('auth.post.register'), [
        'username' => 'newuser',
        'email' => 'newuser@example.com',
        'name_first' => 'New',
        'name_last' => 'User',
        'password' => 'secret1234',
        'password_confirmation' => 'secret1234',
        'root_admin' => true, // Attempt privilege escalation
    ]);

    $response->assertOk()
        ->assertJsonPath('data.complete', true)
        ->assertJsonPath('data.intended', '/')
        ->assertJsonPath('data.user.username', 'newuser')
        ->assertJsonPath('data.user.email', 'newuser@example.com');

    $user = User::query()->where('username', 'newuser')->firstOrFail();
    expect($user->email)->toBe('newuser@example.com')
        ->and($user->name_first)->toBe('New')
        ->and($user->name_last)->toBe('User')
        ->and($user->root_admin)->toBeFalse()
        ->and(Hash::check('secret1234', $user->password))->toBeTrue();

    $this->assertAuthenticatedAs($user);
    Event::assertDispatched(fn (DirectLogin $event) => $event->user->is($user));
});

test('registration falls back to username when name fields are omitted', function () {
    config()->set('aquadactyl.features.registration', true);

    $this->postJson(route('auth.post.register'), [
        'username' => 'fallbackuser',
        'email' => 'fallback@example.com',
        'password' => 'secret1234',
        'password_confirmation' => 'secret1234',
    ])->assertOk();

    $user = User::query()->where('username', 'fallbackuser')->firstOrFail();
    expect($user->name_first)->toBe('fallbackuser')
        ->and($user->name_last)->toBe('fallbackuser');
});

test('registration accepts first_name and last_name aliases', function () {
    config()->set('aquadactyl.features.registration', true);

    $this->postJson(route('auth.post.register'), [
        'username' => 'aliasuser',
        'email' => 'alias@example.com',
        'first_name' => 'John',
        'last_name' => 'Doe',
        'password' => 'secret1234',
        'password_confirmation' => 'secret1234',
    ])->assertOk();

    $user = User::query()->where('username', 'aliasuser')->firstOrFail();
    expect($user->name_first)->toBe('John')
        ->and($user->name_last)->toBe('Doe');
});

test('registration rejects duplicate username or email', function () {
    config()->set('aquadactyl.features.registration', true);
    $existing = User::factory()->create([
        'username' => 'existinguser',
        'email' => 'existing@example.com',
    ]);

    $this->postJson(route('auth.post.register'), [
        'username' => 'existinguser',
        'email' => 'another@example.com',
        'password' => 'secret1234',
        'password_confirmation' => 'secret1234',
    ])->assertUnprocessable()->assertJsonPath('errors.0.meta.source_field', 'username');

    $this->postJson(route('auth.post.register'), [
        'username' => 'otheruser',
        'email' => 'existing@example.com',
        'password' => 'secret1234',
        'password_confirmation' => 'secret1234',
    ])->assertUnprocessable()->assertJsonPath('errors.0.meta.source_field', 'email');
});

test('registration validates password minimum length and confirmation', function () {
    config()->set('aquadactyl.features.registration', true);

    $this->postJson(route('auth.post.register'), [
        'username' => 'shortpass',
        'email' => 'shortpass@example.com',
        'password' => 'short',
        'password_confirmation' => 'short',
    ])->assertUnprocessable()->assertJsonPath('errors.0.meta.source_field', 'password');

    $this->postJson(route('auth.post.register'), [
        'username' => 'mismatchpass',
        'email' => 'mismatch@example.com',
        'password' => 'secret1234',
        'password_confirmation' => 'different1234',
    ])->assertUnprocessable()->assertJsonPath('errors.0.meta.source_field', 'password');
});

test('registration validates username format', function () {
    config()->set('aquadactyl.features.registration', true);

    $this->postJson(route('auth.post.register'), [
        'username' => '_invaliduser',
        'email' => 'invalid@example.com',
        'password' => 'secret1234',
        'password_confirmation' => 'secret1234',
    ])->assertUnprocessable()->assertJsonPath('errors.0.meta.source_field', 'username');
});

test('authenticated user cannot register', function () {
    config()->set('aquadactyl.features.registration', true);
    $user = User::factory()->create();

    $this->actingAs($user)->postJson(route('auth.post.register'), [
        'username' => 'authuser',
        'email' => 'auth@example.com',
        'password' => 'secret1234',
        'password_confirmation' => 'secret1234',
    ])->assertRedirect('/');
});
