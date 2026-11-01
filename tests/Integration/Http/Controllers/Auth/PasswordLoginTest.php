<?php

use Pterodactyl\Models\User;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Event;
use Pterodactyl\Events\Auth\DirectLogin;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set('recaptcha.enabled', false);
    Event::fake([Failed::class, DirectLogin::class, Lockout::class]);
});

test('password sign-in supports usernames and email addresses and honors two-factor checkpoints', function (bool $twoFactor, string $field) {
    $user = User::factory()->create(['password' => Hash::make('TestingPassword123!'), 'use_totp' => $twoFactor]);
    $response = $this->postJson('/auth/login', ['user' => $user->{$field}, 'password' => 'TestingPassword123!'])->assertOk()->assertJsonPath('data.complete', !$twoFactor);
    if ($twoFactor) {
        $this->assertGuest();
        $response->assertSessionHas('auth_confirmation_token.user_id', $user->id);
        expect($response->json('data.confirmation_token'))->toHaveLength(64);
        Event::assertNotDispatched(DirectLogin::class);
    } else {
        $this->assertAuthenticatedAs($user);
        Event::assertDispatched(DirectLogin::class);
    }
})->with([[true, 'email'], [false, 'username']]);

test('unknown users and incorrect passwords produce the same failure without logging passwords', function (bool $exists) {
    $username = 'coverage-password-login';
    if ($exists) {
        User::factory()->create(['username' => $username]);
    }
    $this->postJson('/auth/login', ['user' => $username, 'password' => 'incorrect-sensitive-password'])->assertBadRequest();
    $this->assertGuest();
    Event::assertDispatched(Failed::class, fn ($event) => !in_array('incorrect-sensitive-password', $event->credentials, true));
})->with([true, false]);

test('malformed password login requests fail validation instead of crashing', function (array $payload) {
    expect((new Pterodactyl\Http\Requests\Auth\LoginRequest())->authorize())->toBeTrue();
    $this->postJson('/auth/login', $payload)->assertUnprocessable();
    $this->assertGuest();
})->with([[[]], [['user' => 'test']], [['user' => ['invalid'], 'password' => ['invalid']]]]);

test('repeated incorrect passwords trigger the login lockout', function () {
    $payload = ['user' => 'coverage-rate-limited', 'password' => 'incorrect'];
    for ($attempt = 0; $attempt < 5; ++$attempt) {
        $this->postJson('/auth/login', $payload)->assertBadRequest();
    }
    $this->postJson('/auth/login', $payload)->assertStatus(429);
    Event::assertDispatched(Lockout::class);
});
