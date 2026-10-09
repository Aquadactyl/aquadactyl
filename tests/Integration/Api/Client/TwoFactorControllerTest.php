<?php

use Carbon\Carbon;
use Pterodactyl\Models\User;
use Illuminate\Http\Response;
use PragmaRX\Google2FA\Google2FA;
use Pterodactyl\Models\RecoveryToken;
use PHPUnit\Framework\ExpectationFailedException;

test('two factor image data is returned', function () {
    /** @var User $user */
    $user = User::factory()->create(['use_totp' => false]);

    expect($user->use_totp)->toBeFalse()
        ->and($user->totp_secret)->toBeEmpty()
        ->and($user->totp_authenticated_at)->toBeEmpty();

    $response = $this->actingAs($user)->getJson('/api/client/account/two-factor');

    $response->assertOk();
    $response->assertJsonStructure(['data' => ['image_url_data']]);

    $user = $user->refresh();

    expect($user->use_totp)->toBeFalse()
        ->and($user->totp_secret)->not->toBeEmpty()
        ->and($user->totp_authenticated_at)->toBeEmpty();
});

test('error is returned when two factor is already enabled', function () {
    /** @var User $user */
    $user = User::factory()->create(['use_totp' => true]);

    $response = $this->actingAs($user)->getJson('/api/client/account/two-factor');

    $response->assertStatus(Response::HTTP_BAD_REQUEST);
    $response->assertJsonPath('errors.0.code', 'BadRequestHttpException');
    $response->assertJsonPath('errors.0.detail', 'Two-factor authentication is already enabled on this account.');
});

test('validation error is returned if invalid data is passed to enabled 2fa', function () {
    /** @var User $user */
    $user = User::factory()->create(['use_totp' => false]);

    $this->actingAs($user)
        ->postJson('/api/client/account/two-factor', ['code' => ''])
        ->assertUnprocessable()
        ->assertJsonPath('errors.0.meta.rule', 'required')
        ->assertJsonPath('errors.0.meta.source_field', 'code')
        ->assertJsonPath('errors.1.meta.rule', 'required')
        ->assertJsonPath('errors.1.meta.source_field', 'password');
});

test('two factor can be enabled on account', function () {
    /** @var User $user */
    $user = User::factory()->create(['use_totp' => false]);

    // Make the initial call to get the account setup for 2FA.
    $this->actingAs($user)->getJson('/api/client/account/two-factor')->assertOk();

    $user = $user->refresh();
    expect($user->totp_secret)->not->toBeNull();

    /** @var Google2FA $service */
    $service = app(Google2FA::class);

    $secret = decrypt($user->totp_secret);
    $token = $service->getCurrentOtp($secret);

    $response = $this->actingAs($user)->postJson('/api/client/account/two-factor', [
        'code' => $token,
        'password' => 'password',
    ]);

    $response->assertOk();
    $response->assertJsonPath('object', 'recovery_tokens');

    $user = $user->refresh();
    expect($user->use_totp)->toBeTrue();

    $tokens = RecoveryToken::query()->where('user_id', $user->id)->get();
    expect($tokens)->toHaveCount(10);
    $hashInfo = password_get_info($tokens[0]->token);
    expect($hashInfo['algoName'])->toBe('bcrypt')
        ->and($hashInfo['options']['cost'])->toBeGreaterThanOrEqual(12)
        // Ensure the recovery tokens that were created include a "created_at" timestamp
        // value on them.
        ->and($tokens[0]->created_at)->not->toBeNull();

    $tokens = $tokens->pluck('token')->toArray();

    foreach ($response->json('attributes.tokens') as $raw) {
        foreach ($tokens as $hashed) {
            if (password_verify($raw, $hashed)) {
                continue 2;
            }
        }

        throw new ExpectationFailedException(sprintf('Failed asserting that token [%s] exists as a hashed value in recovery_tokens table.', $raw));
    }
});

test('two factor can be disabled on account', function () {
    Carbon::setTestNow(Carbon::now());

    /** @var User $user */
    $user = User::factory()->create(['use_totp' => true]);

    $response = $this->actingAs($user)->postJson('/api/client/account/two-factor/disable', [
        'password' => 'invalid',
    ]);

    $response->assertStatus(Response::HTTP_BAD_REQUEST);
    $response->assertJsonPath('errors.0.code', 'BadRequestHttpException');
    $response->assertJsonPath('errors.0.detail', 'The password provided was not valid.');

    $response = $this->actingAs($user)->postJson('/api/client/account/two-factor/disable', [
        'password' => 'password',
    ]);

    $response->assertStatus(Response::HTTP_NO_CONTENT);

    $user = $user->refresh();
    expect($user->use_totp)->toBeFalse()
        ->and($user->totp_authenticated_at)->not->toBeNull()
        ->and($user->totp_authenticated_at->toAtomString())->toBe(Carbon::now()->toAtomString());
});

test('no error is returned if two factor is not enabled', function () {
    Carbon::setTestNow(Carbon::now());

    /** @var User $user */
    $user = User::factory()->create(['use_totp' => false]);

    $response = $this->actingAs($user)->postJson('/api/client/account/two-factor/disable', [
        'password' => 'password',
    ]);

    $response->assertStatus(Response::HTTP_NO_CONTENT);
});

test('enabling two factor requires valid password', function () {
    $user = User::factory()->create(['use_totp' => false]);

    $this->actingAs($user)
        ->postJson('/api/client/account/two-factor', [
            'code' => '123456',
            'password' => 'foo',
        ])
        ->assertStatus(Response::HTTP_BAD_REQUEST)
        ->assertJsonPath('errors.0.detail', 'The password provided was not valid.');

    expect($user->refresh()->use_totp)->toBeFalse();
});

test('disabling two factor requires valid password', function () {
    $user = User::factory()->create(['use_totp' => true]);

    $this->actingAs($user)
        ->postJson('/api/client/account/two-factor/disable', [
            'password' => 'foo',
        ])
        ->assertStatus(Response::HTTP_BAD_REQUEST)
        ->assertJsonPath('errors.0.detail', 'The password provided was not valid.');

    expect($user->refresh()->use_totp)->toBeTrue();
});
