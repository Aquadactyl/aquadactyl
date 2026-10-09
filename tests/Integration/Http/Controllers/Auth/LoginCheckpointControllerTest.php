<?php

use Carbon\Carbon;
use Pterodactyl\Models\User;
use PragmaRX\Google2FA\Google2FA;
use Illuminate\Auth\Events\Failed;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Session;
use Pterodactyl\Events\Auth\DirectLogin;
use Pterodactyl\Events\Auth\ProvidedAuthenticationToken;

beforeEach(function () {
    Event::fake([Failed::class, DirectLogin::class, ProvidedAuthenticationToken::class]);
});

test('user can sign in using totp token', function (?int $ts) {
    $user = User::factory()->create([
        'use_totp' => true,
        'totp_secret' => encrypt(str_repeat('a', 16)),
        'totp_authenticated_at' => is_null($ts) ? null : Carbon::now()->addSeconds($ts),
    ]);

    Session::put('auth_confirmation_token', [
        'user_id' => $user->id,
        'token_value' => 'token',
        'expires_at' => now()->addMinutes(5),
    ]);

    $totp = $this->app->make(Google2FA::class)->getCurrentOtp(str_repeat('a', 16));

    $this->withoutExceptionHandling()->postJson(route('auth.login-checkpoint', [
        'confirmation_token' => 'token',
        'authentication_code' => $totp,
    ]))
        ->assertOk()
        ->assertSessionMissing('auth_confirmation_token')
        ->assertJsonPath('data.complete', true)
        ->assertJsonPath('data.intended', '/')
        ->assertJsonPath('data.user.uuid', $user->uuid);

    expect($user->refresh()->totp_authenticated_at)->toEqual(now());

    $this->assertAuthenticatedAs($user);

    Event::assertDispatched(fn (DirectLogin $event) => $event->user->is($user) && $event->remember);
    Event::assertDispatched(fn (ProvidedAuthenticationToken $event) => $event->user->is($user));
})->with([null, -31, -60]);

test('totp token cannot be reused', function (int $seconds) {
    $user = User::factory()->create([
        'use_totp' => true,
        'totp_secret' => encrypt(str_repeat('a', 16)),
        'totp_authenticated_at' => now()->addSeconds($seconds),
    ]);

    Session::put('auth_confirmation_token', [
        'user_id' => $user->id,
        'token_value' => 'token',
        'expires_at' => now()->addMinutes(5),
    ]);

    $totp = $this->app->make(Google2FA::class)->getCurrentOtp(str_repeat('a', 16));

    $this->postJson(route('auth.login-checkpoint', [
        'confirmation_token' => 'token',
        'authentication_code' => $totp,
    ]))
        ->assertBadRequest()
        ->assertJsonPath('errors.0.detail', 'The two-factor authentication token was invalid.');

    $this->assertGuest();
    expect($user->refresh()->totp_authenticated_at)->toEqual(now()->addSeconds($seconds));

    Event::assertDispatched(fn (Failed $event) => $event->guard === 'auth' && $event->user->is($user));
})->with([1, 30, 80]);

test('endpoint returns error if session missing', function () {
    $this->postJson(route('auth.login-checkpoint'))
        ->assertUnprocessable()
        ->assertJsonPath('errors.0.meta.source_field', 'confirmation_token')
        ->assertJsonPath('errors.1.meta.source_field', 'authentication_code')
        ->assertJsonPath('errors.2.meta.source_field', 'recovery_token');

    $this->postJson(route('auth.login-checkpoint', [
        'confirmation_token' => 'token',
        'authentication_code' => '123456',
    ]))
        ->assertBadRequest()
        ->assertJsonPath('errors.0.detail', 'The authentication token provided has expired, please refresh the page and try again.');

    $this->assertGuest();

    Event::assertDispatched(fn (Failed $event) => $event->guard === 'auth');
});

test('endpoint applies throttling', function () {
    for ($i = 0; $i < 5; ++$i) {
        $this->postJson(route('auth.login-checkpoint', ['confirmation_token' => 'token', 'authentication_code' => '123456']))
            ->assertBadRequest();
    }

    $this->postJson(route('auth.login-checkpoint', ['confirmation_token' => 'token', 'authentication_code' => '123456']))
        ->assertTooManyRequests();
});

test('endpoint blocks session data mismatch', function () {
    $user = User::factory()->create([
        'use_totp' => true,
        'totp_secret' => str_repeat('a', 16),
    ]);

    Session::put('auth_confirmation_token', [
        'user_id' => $user->id,
        'token_value' => 'token',
        'expires_at' => now()->addMinutes(5),
    ]);

    $this->postJson(route('auth.login-checkpoint', [
        'confirmation_token' => 'wrong-token',
        'authentication_code' => $this->app->make(Google2FA::class)->getCurrentOtp(str_repeat('a', 16)),
    ]))
        ->assertBadRequest();

    $this->assertGuest();

    Event::assertDispatched(Failed::class);
});

test('endpoint returns error if user does not exist', function () {
    Session::put('auth_confirmation_token', [
        'user_id' => 0,
        'token_value' => 'token',
        'expires_at' => now()->addMinutes(5),
    ]);

    $this->postJson(route('auth.login-checkpoint', [
        'confirmation_token' => 'token',
        'authentication_code' => '123456',
    ]))
        ->assertBadRequest()
        ->assertJsonPath('errors.0.detail', 'The authentication token provided has expired, please refresh the page and try again.');
});

test('endpoint allows recovery token', function () {
    $user = User::factory()->create();
    $token = $user->recoveryTokens()->forceCreate(['token' => password_hash('recovery', PASSWORD_DEFAULT)]);

    Session::put('auth_confirmation_token', [
        'user_id' => $user->id,
        'token_value' => 'token',
        'expires_at' => now()->addMinutes(5),
    ]);

    $this->postJson(route('auth.login-checkpoint', [
        'confirmation_token' => 'token',
        'recovery_token' => 'invalid',
    ]))
        ->assertBadRequest()
        ->assertJsonPath('errors.0.detail', 'The recovery token provided is not valid.');

    $this->assertGuest();

    $this->postJson(route('auth.login-checkpoint', [
        'confirmation_token' => 'token',
        'recovery_token' => 'recovery',
    ]))
        ->assertOk()
        ->assertSessionMissing('auth_confirmation_token');

    Event::assertDispatched(ProvidedAuthenticationToken::class);
    Event::assertDispatched(DirectLogin::class);
});
