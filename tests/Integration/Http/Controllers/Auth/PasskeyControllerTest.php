<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Setting;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Pterodactyl\Models\AccountPasskey;
use Pterodactyl\Services\Accounts\PasskeyService;
use Pterodactyl\Tests\Fixtures\PasskeyAuthenticator;
use Pterodactyl\Services\Accounts\AccountSecuritySettings;

beforeEach(function () {
    config()->set('app.url', 'http://localhost:8083');
    config()->set('pterodactyl.auth.2fa_required', 0);
    Setting::query()->where('key', 'like', 'settings::security:%')->delete();
    $this->user = User::factory()->create(['password' => Hash::make('PasskeyTesting123!'), 'use_totp' => false]);
    $this->authenticator = new PasskeyAuthenticator();
});

function enrolTestPasskey($test): void
{
    $options = $test->actingAs($test->user, 'web')->postJson('/account/security/passkeys/options', ['current_password' => 'PasskeyTesting123!'])->assertOk();
    $test->postJson('/account/security/passkeys', $test->authenticator->registration($options->json('publicKey.challenge')))->assertNoContent();
    Auth::guard('web')->logout();
}

test('a real signed passkey can be enrolled and used to sign in', function () {
    enrolTestPasskey($this);
    $options = $this->postJson('/auth/passkeys/options')->assertOk()->assertJsonPath('publicKey.userVerification', 'required');
    $this->postJson('/auth/passkeys/login', $this->authenticator->assertion($options->json('publicKey.challenge'), $this->user))
        ->assertOk()->assertJsonPath('data.complete', true);
    $this->assertAuthenticatedAs($this->user);
    expect(AccountPasskey::query()->where('user_id', $this->user->id)->first()->signature_counter)->toBe(1);
    $this->getJson('/account/security')->assertOk()->assertJsonMissingPath('passkeys.0.public_key')->assertJsonMissingPath('passkeys.0.credential_id');
});

test('passkey login preserves the two-factor checkpoint', function () {
    enrolTestPasskey($this);
    $this->user->update(['use_totp' => true]);
    $options = $this->postJson('/auth/passkeys/options')->assertOk();
    $this->postJson('/auth/passkeys/login', $this->authenticator->assertion($options->json('publicKey.challenge'), $this->user))
        ->assertOk()->assertJsonPath('data.complete', false)->assertSessionHas('auth_confirmation_token.user_id', $this->user->id);
    $this->assertGuest();
});

test('registration requires the current password and verified user presence', function () {
    $this->actingAs($this->user)->postJson('/account/security/passkeys/options', ['current_password' => 'wrong'])->assertUnprocessable();
    $options = $this->postJson('/account/security/passkeys/options', ['current_password' => 'PasskeyTesting123!'])->assertOk();
    $this->postJson('/account/security/passkeys', $this->authenticator->registration($options->json('publicKey.challenge'), verified: false))->assertUnprocessable();
    $this->assertDatabaseMissing('account_passkeys', ['user_id' => $this->user->id]);
});

test('registration requires a fresh ceremony even with a valid attestation', function () {
    $this->actingAs($this->user)->postJson('/account/security/passkeys', $this->authenticator->registration(PasskeyService::encode(random_bytes(32))))->assertUnprocessable();
});

test('passkey assertions reject invalid origins, challenges, signatures, handles and verification', function (string $failure) {
    enrolTestPasskey($this);
    $options = $this->postJson('/auth/passkeys/options')->assertOk();
    $challenge = $failure === 'challenge' ? PasskeyService::encode(random_bytes(32)) : $options->json('publicKey.challenge');
    $assertion = $this->authenticator->assertion($challenge, $this->user,
        origin: $failure === 'origin' ? 'https://evil.localhost' : 'http://localhost:8083', verified: $failure !== 'verification');
    if ($failure === 'signature') {
        $assertion['response']['signature'] = PasskeyService::encode(random_bytes(64));
    }
    if ($failure === 'handle') {
        $assertion['response']['userHandle'] = PasskeyService::encode('another-user');
    }
    $this->postJson('/auth/passkeys/login', $assertion)->assertUnprocessable();
    $this->assertGuest();
})->with(['origin', 'challenge', 'signature', 'handle', 'verification']);

test('passkey ceremonies and increasing counters cannot be replayed', function () {
    enrolTestPasskey($this);
    $options = $this->postJson('/auth/passkeys/options')->assertOk();
    $assertion = $this->authenticator->assertion($options->json('publicKey.challenge'), $this->user, counter: 2);
    $this->postJson('/auth/passkeys/login', $assertion)->assertOk();
    Auth::guard('web')->logout();
    $this->postJson('/auth/passkeys/login', $assertion)->assertUnprocessable();
    $options = $this->postJson('/auth/passkeys/options')->assertOk();
    $this->postJson('/auth/passkeys/login', $this->authenticator->assertion($options->json('publicKey.challenge'), $this->user, counter: 1))->assertUnprocessable();
    $this->assertGuest();
});

test('users cannot delete another account passkey and deletion requires a password', function () {
    enrolTestPasskey($this);
    $key = AccountPasskey::query()->where('user_id', $this->user->id)->first();
    $other = User::factory()->create(['password' => Hash::make('PasskeyTesting123!')]);
    session()->forget('password_hash_web');
    $this->actingAs($other)->deleteJson('/account/security/passkeys/' . $key->id, ['current_password' => 'PasskeyTesting123!'])->assertNotFound();
    session()->forget('password_hash_web');
    $this->actingAs($this->user)->deleteJson('/account/security/passkeys/' . $key->id, ['current_password' => 'wrong'])->assertUnprocessable();
    $this->deleteJson('/account/security/passkeys/' . $key->id, ['current_password' => 'PasskeyTesting123!'])->assertNoContent();
});

test('passkey feature toggle and HTTPS requirements are enforced', function () {
    app(AccountSecuritySettings::class)->set('passkeys:enabled', '0');
    $this->postJson('/auth/passkeys/options')->assertForbidden();
    app(AccountSecuritySettings::class)->set('passkeys:enabled', '1');
    config()->set('app.url', 'http://panel.example.com');
    $this->getJson('/auth/methods')->assertJsonPath('passkeys_enabled', false);
    $this->postJson('/auth/passkeys/options')->assertForbidden();
});

test('account sign-in management requires a browser session', function () {
    $this->withHeader('Authorization', 'Bearer fake-api-token')->getJson('/account/security')->assertUnauthorized();
});

test('passkey decoding rejects noncanonical malformed and oversized binary encodings', function (string $encoded) {
    expect(fn () => PasskeyService::decode($encoded))->toThrow(Illuminate\Validation\ValidationException::class);
})->with(['', '=', 'A', 'AB', str_repeat('a', 131073)]);

test('passkey registration rejects mismatched credential identifiers and malformed client data', function (string $failure) {
    $options = $this->actingAs($this->user)->postJson('/account/security/passkeys/options', ['current_password' => 'PasskeyTesting123!'])->assertOk();
    $registration = $this->authenticator->registration($options->json('publicKey.challenge'));
    if ($failure === 'identifier') {
        $registration['id'] = PasskeyService::encode(random_bytes(32));
    } else {
        $registration['response']['clientDataJSON'] = PasskeyService::encode('{');
    }
    $this->postJson('/account/security/passkeys', $registration)->assertUnprocessable();
    $this->assertDatabaseMissing('account_passkeys', ['user_id' => $this->user->id]);
})->with(['identifier', 'client-data']);

test('an existing passkey is excluded from enrollment and cannot be registered twice', function () {
    enrolTestPasskey($this);
    $options = $this->actingAs($this->user)->postJson('/account/security/passkeys/options', ['current_password' => 'PasskeyTesting123!'])->assertOk();
    expect($options->json('publicKey.excludeCredentials'))->toHaveCount(1);
    $this->postJson('/account/security/passkeys', $this->authenticator->registration($options->json('publicKey.challenge')))->assertUnprocessable();
    expect(AccountPasskey::where('user_id', $this->user->id)->count())->toBe(1);
});

test('passkey enrollment rejects account changes even if verification holds an older user snapshot', function (string $change) {
    $options = $this->actingAs($this->user)->postJson('/account/security/passkeys/options', ['current_password' => 'PasskeyTesting123!'])->assertOk();
    $snapshot = $this->user->fresh();
    $registration = $this->authenticator->registration($options->json('publicKey.challenge'));
    User::whereKey($snapshot->id)->update($change === 'password'
        ? ['password' => Hash::make('ChangedPassword123!')]
        : ['suspended_at' => now()]);
    $request = Illuminate\Http\Request::create('/account/security/passkeys', 'POST');
    $request->setLaravelSession(app('session.store'));

    expect(fn () => app(PasskeyService::class)->register($request, $snapshot, $registration))->toThrow(Illuminate\Validation\ValidationException::class);
    $this->assertDatabaseMissing('account_passkeys', ['user_id' => $snapshot->id]);
})->with(['password', 'suspension']);

test('changing client IPs does not bypass the account security password attempt limit', function () {
    $this->actingAs($this->user);
    for ($attempt = 0; $attempt < 10; ++$attempt) {
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.' . ($attempt + 1)])
            ->postJson('/account/security/passkeys/options', ['current_password' => 'wrong'])->assertUnprocessable();
    }
    $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.1'])
        ->postJson('/account/security/passkeys/options', ['current_password' => 'wrong'])->assertTooManyRequests()->assertHeader('Retry-After');
    $this->assertDatabaseMissing('account_passkeys', ['user_id' => $this->user->id]);
});

test('password confirmation attempts share an account limit across client and administrator settings', function () {
    $this->user->update(['root_admin' => true]);
    $this->actingAs($this->user);
    for ($attempt = 0; $attempt < 10; ++$attempt) {
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.' . ($attempt + 1)]);
        ($attempt % 2 === 0
            ? $this->postJson('/account/security/passkeys/options', ['current_password' => 'wrong'])
            : $this->patchJson('/admin/settings/oauth', ['current_password' => 'wrong']))->assertUnprocessable();
    }
    $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.1'])
        ->patchJson('/admin/settings/oauth', ['current_password' => 'PasskeyTesting123!'])->assertTooManyRequests()->assertHeader('Retry-After');
});
