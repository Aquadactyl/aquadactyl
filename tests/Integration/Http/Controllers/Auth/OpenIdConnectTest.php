<?php

use Firebase\JWT\JWT;
use GuzzleHttp\Client;
use GuzzleHttp\HandlerStack;
use Pterodactyl\Models\User;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Setting;
use GuzzleHttp\Handler\MockHandler;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Crypt;
use Pterodactyl\Models\AccountOAuthIdentity;
use Pterodactyl\Services\Accounts\PasskeyService;
use Pterodactyl\Services\Accounts\AccountSecuritySettings;
use Pterodactyl\Services\Accounts\OAuth\OAuthProviderFactory;
use Pterodactyl\Services\Accounts\OAuth\OpenIdConnectDiscovery;

beforeEach(function () {
    config()->set('app.url', 'http://localhost:8083');
    config()->set('pterodactyl.auth.2fa_required', 0);
    Setting::query()->where('key', 'like', 'settings::security:%')->delete();
    AccountOAuthIdentity::query()->delete();
    $this->user = User::factory()->create(['use_totp' => false]);
    $settings = app(AccountSecuritySettings::class);
    $settings->set('oauth:oidc:enabled', '1');
    $settings->set('oauth:oidc:client_id', 'oidc-test-client');
    $settings->set('oauth:oidc:client_secret', Crypt::encryptString('test-secret'));
    $settings->set('oauth:oidc:issuer', 'https://sso.example.test');
    AccountOAuthIdentity::query()->create([
        'user_id' => $this->user->id, 'provider' => 'oidc', 'issuer' => 'https://sso.example.test', 'subject' => 'oidc-subject',
        'identity_hash' => AccountOAuthIdentity::identityHash('oidc', 'https://sso.example.test', 'oidc-subject'),
    ]);
});

function mockOidcIdentity($test, string $failure = ''): void
{
    $rsa = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    openssl_pkey_export($rsa, $privateKey);
    $details = openssl_pkey_get_details($rsa)['rsa'];
    Http::preventStrayRequests();
    Http::fake([
        'https://sso.example.test/.well-known/openid-configuration' => Http::response([
            'issuer' => 'https://sso.example.test', 'authorization_endpoint' => 'https://sso.example.test/authorize',
            'token_endpoint' => 'https://sso.example.test/token', 'jwks_uri' => 'https://sso.example.test/keys',
            'code_challenge_methods_supported' => ['S256'], 'token_endpoint_auth_methods_supported' => ['client_secret_basic'],
        ]),
        'https://sso.example.test/keys' => Http::response(['keys' => [[
            'kty' => 'RSA', 'kid' => 'test-key', 'use' => 'sig', 'alg' => 'RS256',
            'n' => PasskeyService::encode($details['n']), 'e' => PasskeyService::encode($details['e']),
        ]]]),
    ]);
    $factory = new OAuthProviderFactory();
    $mock = Mockery::mock(OAuthProviderFactory::class);
    app()->instance(OAuthProviderFactory::class, $mock);
    $mock->shouldReceive('make')->andReturnUsing(function ($config, $nonce) use ($factory, $privateKey, $failure) {
        $claims = ['iss' => 'https://sso.example.test', 'sub' => 'oidc-subject', 'aud' => 'oidc-test-client',
            'iat' => time(), 'exp' => time() + 300, 'nonce' => $nonce, 'name' => 'OIDC user'];
        if ($failure === 'issuer') {
            $claims['iss'] = 'https://other.example.test';
        }
        if ($failure === 'audience') {
            $claims['aud'] = 'other-client';
        }
        if ($failure === 'nonce') {
            $claims['nonce'] = 'different-nonce';
        }
        if ($failure === 'expired') {
            $claims['exp'] = time() - 60;
        }
        if ($failure === 'azp') {
            $claims['aud'] = ['oidc-test-client', 'another-client'];
        }
        if ($failure === 'subject') {
            $claims['sub'] = '';
        }
        $algorithm = $failure === 'algorithm' ? 'HS256' : 'RS256';
        $jwt = JWT::encode($claims, $failure === 'algorithm' ? str_repeat('secret', 8) : $privateKey, $algorithm, $failure === 'key' ? 'unknown-key' : 'test-key');
        if ($failure === 'signature') {
            $jwt = substr($jwt, 0, strrpos($jwt, '.') + 1) . PasskeyService::encode(random_bytes(256));
        }
        $handler = new MockHandler([new Response(200, ['Content-Type' => 'application/json'], json_encode(['access_token' => 'unused-access-token', 'id_token' => $jwt]))]);

        return $factory->make($config, $nonce)->setHttpClient(new Client(['handler' => HandlerStack::create($handler)]));
    });
}

test('OpenID Connect verifies a real signed token and requests nonce and PKCE', function () {
    mockOidcIdentity($this);
    $response = $this->get('/auth/oauth/oidc')->assertRedirect();
    parse_str(parse_url($response->headers->get('Location'), PHP_URL_QUERY), $query);
    expect($query['nonce'])->toBe(session('oauth_flow.nonce'));
    expect($query['code_challenge_method'])->toBe('S256');
    expect($query['scope'])->toContain('openid');
    $this->get('/auth/oauth/oidc/callback?' . http_build_query(['state' => session('state'), 'code' => 'test-code']))->assertRedirect('/');
    $this->assertAuthenticatedAs($this->user);
});

test('OpenID Connect rejects untrusted tokens', function (string $failure) {
    mockOidcIdentity($this, $failure);
    $this->get('/auth/oauth/oidc')->assertRedirect();
    $this->get('/auth/oauth/oidc/callback?' . http_build_query(['state' => session('state'), 'code' => 'test-code']))
        ->assertRedirect('/auth/login')->assertSessionHas('oauth_error');
    $this->assertGuest();
})->with(['issuer', 'audience', 'nonce', 'expired', 'azp', 'subject', 'algorithm', 'signature', 'key']);

test('OIDC discovery rejects a different issuer and insecure endpoints', function (string $failure) {
    Http::fake(['*' => Http::response([
        'issuer' => $failure === 'issuer' ? 'https://evil.example.test' : 'https://sso.example.test',
        'authorization_endpoint' => 'https://sso.example.test/authorize', 'token_endpoint' => 'http://sso.example.test/token',
        'jwks_uri' => 'https://sso.example.test/keys', 'code_challenge_methods_supported' => ['S256'],
    ])]);
    expect(fn () => app(OpenIdConnectDiscovery::class)->metadata('https://sso.example.test'))->toThrow(RuntimeException::class);
})->with(['issuer', 'endpoint']);

test('OpenID discovery rejects oversized non-object and non-PKCE documents', function (string $failure) {
    $body = match ($failure) {
        'large' => str_repeat('a', 1048577), 'scalar' => 'null',
        default => ['issuer' => 'https://sso.example.test', 'authorization_endpoint' => 'https://sso.example.test/authorize', 'token_endpoint' => 'https://sso.example.test/token', 'jwks_uri' => 'https://sso.example.test/keys', 'code_challenge_methods_supported' => ['plain']],
    };
    Http::fake(['*' => Http::response($body)]);
    expect(fn () => app(OpenIdConnectDiscovery::class)->metadata('https://sso.example.test'))->toThrow(RuntimeException::class);
})->with(['large', 'scalar', 'pkce']);

test('OpenID providers refuse unsupported client authentication and missing identity tokens', function (string $failure) {
    Http::fake(['*' => Http::response([
        'issuer' => 'https://sso.example.test', 'authorization_endpoint' => 'https://sso.example.test/authorize',
        'token_endpoint' => 'https://sso.example.test/token', 'jwks_uri' => 'https://sso.example.test/keys',
        'code_challenge_methods_supported' => ['S256'], 'token_endpoint_auth_methods_supported' => [$failure === 'method' ? 'private_key_jwt' : 'client_secret_post'],
    ])]);
    $factory = new OAuthProviderFactory();
    $this->mock(OAuthProviderFactory::class)->shouldReceive('make')->andReturnUsing(function ($config, $nonce) use ($factory) {
        return $factory->make($config, $nonce)->setHttpClient(new Client(['handler' => HandlerStack::create(new MockHandler([new Response(200, ['Content-Type' => 'application/json'], '{"access_token":"test"}')]))]));
    });
    $this->get('/auth/oauth/oidc')->assertRedirect();
    $this->get('/auth/oauth/oidc/callback?' . http_build_query(['state' => session('state'), 'code' => 'test-code']))->assertRedirect('/auth/login')->assertSessionHas('oauth_error');
    $this->assertGuest();
})->with(['method', 'token']);
