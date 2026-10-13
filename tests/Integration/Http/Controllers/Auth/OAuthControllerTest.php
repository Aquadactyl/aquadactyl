<?php

use GuzzleHttp\Client;
use GuzzleHttp\HandlerStack;
use Pterodactyl\Models\User;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Setting;
use GuzzleHttp\Handler\MockHandler;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Crypt;
use Pterodactyl\Models\AccountOAuthIdentity;
use Pterodactyl\Services\Accounts\AccountSecuritySettings;
use Pterodactyl\Services\Accounts\OAuth\OAuthProviderFactory;

beforeEach(function () {
    config()->set('app.url', 'http://localhost:8083');
    config()->set('pterodactyl.auth.2fa_required', 0);
    Setting::query()->where('key', 'like', 'settings::security:%')->delete();
    AccountOAuthIdentity::query()->delete();
    $this->user = User::factory()->create(['password' => Hash::make('OAuthTesting123!'), 'use_totp' => false]);
    $settings = app(AccountSecuritySettings::class);
    $settings->set('oauth:google:enabled', '1');
    $settings->set('oauth:google:client_id', 'test-client');
    $settings->set('oauth:google:client_secret', Crypt::encryptString('test-secret'));
});

function mockGoogleAccount($test, string $subject = 'provider-subject'): void
{
    $factory = new OAuthProviderFactory();
    $mock = Mockery::mock(OAuthProviderFactory::class);
    app()->instance(OAuthProviderFactory::class, $mock);
    $mock->shouldReceive('make')->andReturnUsing(function ($config, $nonce) use ($factory, $test, $subject) {
        $handler = new MockHandler([
            new Response(200, ['Content-Type' => 'application/json'], json_encode(['access_token' => 'fake-access-token', 'token_type' => 'Bearer'])),
            new Response(200, ['Content-Type' => 'application/json'], json_encode(['sub' => $subject, 'name' => 'Provider user', 'email' => $test->user->email, 'email_verified' => true])),
        ]);

        return $factory->make($config, $nonce)->setHttpClient(new Client(['handler' => HandlerStack::create($handler)]));
    });
}

function linkedGoogleAccount($test): AccountOAuthIdentity
{
    return AccountOAuthIdentity::query()->create([
        'user_id' => $test->user->id, 'provider' => 'google', 'issuer' => 'google', 'subject' => 'provider-subject',
        'identity_hash' => AccountOAuthIdentity::identityHash('google', 'google', 'provider-subject'),
    ]);
}

function completeGoogleCallback($test)
{
    return $test->get('/auth/oauth/google/callback?' . http_build_query(['state' => session('state'), 'code' => 'test-code']));
}

test('OAuth only signs in an explicitly linked account and retains its privileges', function () {
    mockGoogleAccount($this);
    linkedGoogleAccount($this);
    $this->get('/auth/oauth/google')->assertRedirect();
    completeGoogleCallback($this)->assertRedirect('/');
    $this->assertAuthenticatedAs($this->user);
    expect($this->user->refresh()->root_admin)->toBeFalse();
});

test('matching provider email never links or signs in an existing account', function () {
    mockGoogleAccount($this);
    $count = User::query()->count();
    $this->get('/auth/oauth/google')->assertRedirect();
    completeGoogleCallback($this)->assertRedirect('/auth/login')->assertSessionHas('oauth_error');
    $this->assertGuest();
    expect(User::query()->count())->toBe($count);
    $this->assertDatabaseMissing('account_oauth_identities', ['user_id' => $this->user->id]);
});

test('OAuth login preserves the existing TOTP checkpoint', function () {
    mockGoogleAccount($this);
    linkedGoogleAccount($this);
    $this->user->update(['use_totp' => true]);
    $this->get('/auth/oauth/google')->assertRedirect();
    completeGoogleCallback($this)->assertRedirect('/auth/login?oauth=checkpoint')->assertSessionHas('auth_confirmation_token.user_id', $this->user->id);
    $this->assertGuest();
    $this->getJson('/auth/methods?oauth=checkpoint')->assertOk()->assertJsonPath('confirmation_token', session('auth_confirmation_token.token_value'));
});

test('linking requires a current password and binds the callback to that browser account', function () {
    mockGoogleAccount($this);
    $this->actingAs($this->user)->postJson('/account/security/oauth/google', ['current_password' => 'wrong'])->assertUnprocessable();
    $this->postJson('/account/security/oauth/google', ['current_password' => 'OAuthTesting123!'])->assertOk()->assertJsonStructure(['redirect']);
    completeGoogleCallback($this)->assertRedirect('/account')->assertSessionHas('oauth_notice');
    $this->assertDatabaseHas('account_oauth_identities', ['user_id' => $this->user->id, 'subject' => 'provider-subject']);
});

test('an OAuth identity cannot be linked to another user', function () {
    mockGoogleAccount($this);
    linkedGoogleAccount($this);
    $other = User::factory()->create(['password' => Hash::make('OAuthTesting123!')]);
    $this->actingAs($other)->postJson('/account/security/oauth/google', ['current_password' => 'OAuthTesting123!'])->assertOk();
    completeGoogleCallback($this)->assertRedirect('/account')->assertSessionHas('oauth_error');
    $this->assertDatabaseMissing('account_oauth_identities', ['user_id' => $other->id]);
});

test('OAuth rejects mismatched state, expired flows, configuration changes and session changes', function (string $failure) {
    mockGoogleAccount($this);
    if ($failure === 'session' || $failure === 'password') {
        $this->actingAs($this->user)->postJson('/account/security/oauth/google', ['current_password' => 'OAuthTesting123!'])->assertOk();
        if ($failure === 'session') {
            Auth::guard('web')->logout();
        } else {
            $this->user->update(['password' => Hash::make('ChangedPassword123!')]);
        }
    } else {
        $this->get('/auth/oauth/google')->assertRedirect();
    }
    if ($failure === 'state') {
        session()->put('state', 'different-state');
    }
    if ($failure === 'expired') {
        session()->put('oauth_flow.expires_at', time() - 1);
    }
    if ($failure === 'config') {
        app(AccountSecuritySettings::class)->set('oauth:google:client_id', 'changed-client');
    }
    $state = $failure === 'state' ? 'original-wrong-state' : session('state');
    $this->get('/auth/oauth/google/callback?' . http_build_query(['state' => $state, 'code' => 'test-code']))
        ->assertRedirect()->assertSessionHas('oauth_error');
    $this->assertDatabaseMissing('account_oauth_identities', ['user_id' => $this->user->id]);
})->with(['state', 'expired', 'config', 'session', 'password']);

test('callbacks are one use and provider denial has a recoverable error', function () {
    mockGoogleAccount($this);
    linkedGoogleAccount($this);
    $this->get('/auth/oauth/google')->assertRedirect();
    $state = session('state');
    $this->get('/auth/oauth/google/callback?' . http_build_query(['state' => $state, 'error' => 'access_denied']))->assertRedirect('/auth/login')->assertSessionHas('oauth_error');
    $this->get('/auth/oauth/google/callback?' . http_build_query(['state' => $state, 'code' => 'test-code']))->assertRedirect('/auth/login')->assertSessionHas('oauth_error');
    $this->assertGuest();
});

test('unlinking verifies password and ownership including when the provider is disabled', function () {
    $identity = linkedGoogleAccount($this);
    app(AccountSecuritySettings::class)->set('oauth:google:enabled', '0');
    $other = User::factory()->create(['password' => Hash::make('OAuthTesting123!')]);
    $this->actingAs($other)->deleteJson('/account/security/oauth/' . $identity->id, ['current_password' => 'OAuthTesting123!'])->assertNotFound();
    session()->forget('password_hash_web');
    $this->actingAs($this->user)->deleteJson('/account/security/oauth/' . $identity->id, ['current_password' => 'wrong'])->assertUnprocessable();
    $this->deleteJson('/account/security/oauth/' . $identity->id, ['current_password' => 'OAuthTesting123!'])->assertNoContent();
});

test('disabled and unknown OAuth providers cannot start a login', function () {
    $this->get('/auth/oauth/unknown')->assertNotFound();
    $this->get('/auth/oauth/discord')->assertNotFound();
    $this->getJson('/auth/methods')->assertJsonPath('providers.0.id', 'google')->assertJsonMissingPath('providers.0.client_secret');
});

test('each built-in provider exchanges codes and authenticates its linked identity', function (string $provider) {
    $settings = app(AccountSecuritySettings::class);
    $settings->set('oauth:' . $provider . ':enabled', '1');
    $settings->set('oauth:' . $provider . ':client_id', 'test-client');
    $settings->set('oauth:' . $provider . ':client_secret', Crypt::encryptString('test-secret'));
    AccountOAuthIdentity::query()->create([
        'user_id' => $this->user->id, 'provider' => $provider, 'issuer' => $provider, 'subject' => '123456',
        'identity_hash' => AccountOAuthIdentity::identityHash($provider, $provider, '123456'),
    ]);
    $profile = match ($provider) {
        'google' => ['sub' => '123456', 'name' => 'Google account', 'email' => $this->user->email],
        'discord' => ['id' => '123456', 'username' => 'Discord account', 'email' => $this->user->email],
        'github' => ['id' => 123456, 'node_id' => 'github-node', 'login' => 'github-user', 'name' => 'GitHub account', 'avatar_url' => 'https://example.test/avatar.png'],
    };
    $factory = new OAuthProviderFactory();
    $history = [];
    $this->mock(OAuthProviderFactory::class)->shouldReceive('make')->andReturnUsing(function ($config, $nonce) use ($factory, $profile, &$history) {
        $stack = HandlerStack::create(new MockHandler([
            new Response(200, ['Content-Type' => 'application/json'], json_encode(['access_token' => 'provider-access-token', 'token_type' => 'Bearer'])),
            new Response(200, ['Content-Type' => 'application/json'], json_encode($profile)),
            new Response(200, ['Content-Type' => 'application/json'], json_encode([['email' => 'test@example.test', 'primary' => true, 'verified' => true]])),
        ]));
        $stack->push(GuzzleHttp\Middleware::history($history));

        return $factory->make($config, $nonce)->setHttpClient(new Client(['handler' => $stack]));
    });
    $response = $this->get('/auth/oauth/' . $provider)->assertRedirect();
    parse_str(parse_url($response->headers->get('Location'), PHP_URL_QUERY), $query);
    expect($query['state'])->toBe(session('state'));
    expect($query['redirect_uri'])->toBe('http://localhost:8083/auth/oauth/' . $provider . '/callback');
    $verifier = session('code_verifier');
    if ($provider !== 'discord') {
        expect($query['code_challenge_method'])->toBe('S256');
        expect($query['code_challenge'])->toBe(Pterodactyl\Services\Accounts\PasskeyService::encode(hash('sha256', $verifier, true)));
    }
    $this->get('/auth/oauth/' . $provider . '/callback?' . http_build_query(['state' => session('state'), 'code' => 'authorization-code']))->assertRedirect('/');
    $this->assertAuthenticatedAs($this->user);
    parse_str((string) $history[0]['request']->getBody(), $fields);
    expect($fields['code'])->toBe('authorization-code');
    if ($provider !== 'discord') {
        expect($fields['code_verifier'])->toBe($verifier);
    }
})->with(['discord', 'github', 'google']);

test('OAuth provider startup failures are recoverable and never expose provider secrets', function (bool $link) {
    $this->mock(OAuthProviderFactory::class)->shouldReceive('make')->andThrow(new RuntimeException('secret-client-value'));
    if ($link) {
        $this->actingAs($this->user)->postJson('/account/security/oauth/google', ['current_password' => 'OAuthTesting123!'])
            ->assertUnprocessable()->assertJsonPath('errors.0.meta.source_field', 'provider')->assertDontSee('secret-client-value');
    } else {
        $this->get('/auth/oauth/google')->assertRedirect('/auth/login')->assertSessionHas('oauth_error');
        expect(session('oauth_error'))->not->toContain('secret-client-value');
    }
})->with([true, false]);

test('OAuth callbacks reject missing and oversized provider identifiers', function (string $subject) {
    mockGoogleAccount($this, $subject);
    $this->get('/auth/oauth/google')->assertRedirect();
    completeGoogleCallback($this)->assertRedirect('/auth/login')->assertSessionHas('oauth_error');
    $this->assertGuest();
})->with(['', str_repeat('a', 256)]);

test('a login callback cannot replace an account that signed in while authorization was pending', function () {
    mockGoogleAccount($this);
    linkedGoogleAccount($this);
    $this->get('/auth/oauth/google')->assertRedirect();
    $other = User::factory()->create();
    $this->actingAs($other);
    completeGoogleCallback($this)->assertRedirect('/auth/login')->assertSessionHas('oauth_error');
    $this->assertAuthenticatedAs($other);
});

test('malformed panel origins and undecryptable provider secrets fail closed', function () {
    $settings = app(AccountSecuritySettings::class);
    $settings->set('oauth:google:client_secret', 'invalid-ciphertext');
    expect($settings->provider('google')['enabled'])->toBeFalse()->and($settings->provider('google')['client_secret'])->toBe('');
    config()->set('app.url', 'https://username:password@example.test');
    expect(fn () => $settings->origin())->toThrow(RuntimeException::class, 'absolute panel URL');
});
