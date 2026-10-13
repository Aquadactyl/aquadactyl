<?php

use Pterodactyl\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Password;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Notification;
use Pterodactyl\Events\User\PasswordChanged;
use Pterodactyl\Events\Auth\FailedPasswordReset;
use Pterodactyl\Notifications\SendPasswordReset;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set('recaptcha.enabled', false);
    Notification::fake();
    Event::fake([PasswordReset::class, PasswordChanged::class, FailedPasswordReset::class]);
});

test('password reset requests do not reveal whether an account exists', function (bool $exists) {
    if ($exists) {
        $user = User::factory()->create(['email' => 'recovery@example.test']);
    }
    $this->postJson('/auth/password', ['email' => 'recovery@example.test'])->assertOk()->assertJsonPath('status', trans(Password::RESET_LINK_SENT));
    if ($exists) {
        Notification::assertSentTo($user, SendPasswordReset::class);
    } else {
        Notification::assertNothingSent();
        Event::assertDispatched(FailedPasswordReset::class);
    }
})->with([true, false]);

test('a valid password reset rotates credentials and requires a fresh two-factor login when enabled', function (bool $twoFactor) {
    $user = User::factory()->create(['use_totp' => $twoFactor]);
    $user->forceFill(['remember_token' => 'previous-remember-token'])->saveOrFail();
    $token = Password::broker()->createToken($user);
    $oldRemember = $user->remember_token;
    $this->postJson('/auth/password/reset', ['email' => $user->email, 'token' => $token, 'password' => 'NewTestingPassword123!', 'password_confirmation' => 'NewTestingPassword123!'])
        ->assertOk()->assertJsonPath('success', true)->assertJsonPath('send_to_login', $twoFactor)->assertJsonPath('redirect_to', '/');
    expect(Hash::check('NewTestingPassword123!', $user->fresh()->password))->toBeTrue()
        ->and($user->fresh()->remember_token)->not->toBe($oldRemember);
    Event::assertDispatched(PasswordReset::class, fn ($event) => $event->user->id === $user->id);
    Event::assertDispatched(PasswordChanged::class);
    if ($twoFactor) {
        $this->assertGuest();
    } else {
        $this->assertAuthenticatedAs($user);
    }
    expect(Password::broker()->tokenExists($user, $token))->toBeFalse();
})->with([true, false]);

test('invalid reset tokens never change credentials or authenticate the caller', function () {
    $user = User::factory()->create();
    $this->postJson('/auth/password/reset', ['email' => $user->email, 'token' => 'invalid-reset-token', 'password' => 'NewTestingPassword123!', 'password_confirmation' => 'NewTestingPassword123!'])->assertBadRequest();
    $this->assertGuest();
    Event::assertNotDispatched(PasswordReset::class);
    Event::assertNotDispatched(PasswordChanged::class);
});

test('password reset validates confirmation and required credentials', function (array $payload) {
    $this->postJson('/auth/password/reset', $payload)->assertUnprocessable();
    Notification::assertNothingSent();
})->with([[[]], [['email' => 'invalid', 'token' => 'invalid', 'password' => 'short', 'password_confirmation' => 'different']]]);

test('password recovery emails encode the address and link to the correct reset token', function () {
    $user = User::factory()->make(['email' => 'alias+recovery@example.test']);
    $notification = new SendPasswordReset('test-token');
    expect($notification->via())->toBe(['mail']);
    $mail = $notification->toMail($user);
    expect($mail->subject)->toBe('Reset Password')->and($mail->actionUrl)->toContain('/auth/password/reset/test-token?email=alias%2Brecovery%40example.test');
    $testMail = new Pterodactyl\Notifications\MailTested($user);
    expect($testMail->via())->toBe(['mail'])->and($testMail->toMail()->subject)->toBe('Aquadactyl Test Message');
});
