<?php

use Pterodactyl\Models\User;
use PragmaRX\Google2FA\Google2FA;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Http\Controllers\Auth\LoginCheckpointController;

uses(DatabaseTransactions::class);

beforeEach(function () {
    app()->instance(Illuminate\Contracts\Debug\ExceptionHandler::class, new class(app()) extends Pterodactyl\Exceptions\Handler {
        public function render($request, Throwable $exception): Symfony\Component\HttpFoundation\Response
        {
            return (new ReflectionMethod(Illuminate\Foundation\Exceptions\Handler::class, 'render'))->invoke($this, $request, $exception);
        }
    });
    config()->set('recaptcha.enabled', false);
    Queue::fake();
});

test('recovery codes are consumed once even when requests loaded the same token before deletion', function () {
    $user = User::factory()->create(['use_totp' => true]);
    $user->recoveryTokens()->forceCreate(['token' => password_hash('one-use-code', PASSWORD_DEFAULT)]);
    $first = $user->fresh()->load('recoveryTokens');
    $overlapping = $user->fresh()->load('recoveryTokens');
    $method = new ReflectionMethod(LoginCheckpointController::class, 'isValidRecoveryToken');
    $controller = app(LoginCheckpointController::class);
    expect($method->invoke($controller, $first, 'one-use-code'))->toBeTrue();
    expect($method->invoke($controller, $overlapping, 'one-use-code'))->toBeFalse();
    expect($user->recoveryTokens()->count())->toBe(0);
});

test('a TOTP accepted from the clock skew window cannot authenticate a second checkpoint', function () {
    $secret = 'JBSWY3DPEHPK3PXP';
    $user = User::factory()->create(['use_totp' => true, 'totp_secret' => encrypt($secret)]);
    $totp = app(Google2FA::class);
    $counter = $totp->getTimestamp() + 1;
    $code = $totp->oathTotp($secret, $counter);
    $first = $this->postJson('/auth/login', ['user' => $user->username, 'password' => 'password'])->assertOk()->json('data.confirmation_token');
    $this->postJson('/auth/login/checkpoint', ['confirmation_token' => $first, 'authentication_code' => $code])->assertOk();
    $this->postJson('/auth/logout')->assertNoContent();
    $second = $this->postJson('/auth/login', ['user' => $user->username, 'password' => 'password'])->assertOk()->json('data.confirmation_token');
    $this->postJson('/auth/login/checkpoint', ['confirmation_token' => $second, 'authentication_code' => $code])->assertBadRequest();
    $this->assertGuest();
    expect($user->fresh()->totp_authenticated_at->unix())->toBe($counter * $totp->getKeyRegeneration());
});

test('pending two factor logins are invalidated when the password or second factor configuration changes', function (string $change) {
    $user = User::factory()->create(['use_totp' => true, 'totp_secret' => encrypt('JBSWY3DPEHPK3PXP')]);
    $user->recoveryTokens()->forceCreate(['token' => password_hash('recovery-code', PASSWORD_DEFAULT)]);
    $token = $this->postJson('/auth/login', ['user' => $user->username, 'password' => 'password'])->assertOk()->json('data.confirmation_token');
    $user->forceFill(match ($change) {
        'password' => ['password' => Hash::make('ChangedPassword123!')],
        'secret' => ['totp_secret' => encrypt('JBSWY3DPEHPK3PXQ')],
        default => ['use_totp' => false],
    })->saveOrFail();
    $this->postJson('/auth/login/checkpoint', ['confirmation_token' => $token, 'recovery_token' => 'recovery-code'])->assertBadRequest();
    $this->assertGuest();
    expect($user->recoveryTokens()->count())->toBe(1);
})->with(['password', 'secret', 'disabled']);

test('password reset attempts are rate limited before checking tokens', function () {
    for ($attempt = 0; $attempt < 10; ++$attempt) {
        $this->postJson('/auth/password/reset', [])->assertUnprocessable();
    }
    $this->postJson('/auth/password/reset', [])->assertTooManyRequests();
    $this->assertGuest();
});

test('switching client IP addresses does not reset the account limit for second factor attempts', function () {
    $user = User::factory()->create(['use_totp' => true, 'totp_secret' => encrypt('JBSWY3DPEHPK3PXP')]);
    $token = $this->postJson('/auth/login', ['user' => $user->username, 'password' => 'password'])->assertOk()->json('data.confirmation_token');
    $attempts = max(1, (int) config('auth.lockout.attempts'));
    for ($attempt = 0; $attempt < $attempts; ++$attempt) {
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.' . ($attempt + 1)])->postJson('/auth/login/checkpoint', ['confirmation_token' => $token, 'authentication_code' => '0000000'])->assertBadRequest();
    }
    $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.1'])->postJson('/auth/login/checkpoint', ['confirmation_token' => $token, 'authentication_code' => '0000000'])->assertTooManyRequests()->assertHeader('Retry-After');
    $this->assertGuest();
});

test('the final login step still rejects an account suspended after credential verification', function () {
    $user = User::factory()->create(['suspended_at' => now()]);
    $request = Illuminate\Http\Request::create('/auth/login/checkpoint', 'POST');
    $request->setRouteResolver(fn () => new Illuminate\Routing\Route('POST', '/auth/login/checkpoint', fn () => null));
    $method = new ReflectionMethod(Pterodactyl\Http\Controllers\Auth\AbstractLoginController::class, 'sendLoginResponse');
    expect(fn () => $method->invoke(app(LoginCheckpointController::class), $user, $request))->toThrow(Pterodactyl\Exceptions\DisplayException::class);
    $this->assertGuest();
});

test('rejected second factor attempts retain exactly one failure audit entry', function () {
    $user = User::factory()->create(['use_totp' => true, 'totp_secret' => encrypt('JBSWY3DPEHPK3PXP')]);
    $before = Pterodactyl\Models\ActivityLog::where('event', 'auth:fail')->count();
    $token = $this->postJson('/auth/login', ['user' => $user->username, 'password' => 'password'])->assertOk()->json('data.confirmation_token');
    $this->postJson('/auth/login/checkpoint', ['confirmation_token' => $token, 'authentication_code' => '0000000'])->assertBadRequest();
    expect(Pterodactyl\Models\ActivityLog::where('event', 'auth:fail')->count())->toBe($before + 1);
    $this->assertGuest();
});
