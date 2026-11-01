<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Setting;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Crypt;
use Pterodactyl\Services\Accounts\AccountSecuritySettings;

beforeEach(function () {
    config()->set('pterodactyl.auth.2fa_required', 0);
    Setting::query()->where('key', 'like', 'settings::security:%')->delete();
    $this->admin = User::factory()->create(['root_admin' => true, 'password' => Hash::make('AdminOAuthTesting123!')]);
    $this->payload = ['current_password' => 'AdminOAuthTesting123!', 'passkeys_enabled' => '1', 'providers' => []];
    foreach (array_keys(AccountSecuritySettings::PROVIDERS) as $provider) {
        $this->payload['providers'][$provider] = ['enabled' => '0', 'client_id' => '', 'client_secret' => ''];
    }
});

test('an enabled OpenID Connect provider requires an issuer even with valid client credentials', function () {
    $this->payload['providers']['oidc'] = ['enabled' => '1', 'client_id' => 'oidc-client', 'client_secret' => 'oidc-secret', 'issuer' => ''];
    $this->actingAs($this->admin)->patchJson('/admin/settings/oauth', $this->payload)->assertUnprocessable()->assertJsonPath('errors.0.meta.source_field', 'providers.oidc.issuer');
});

test('OAuth settings require an administrator and password confirmation', function () {
    $user = User::factory()->create(['root_admin' => false]);
    $this->actingAs($user)->get('/admin/settings/oauth')->assertForbidden();
    $this->patch('/admin/settings/oauth', $this->payload)->assertForbidden();
    session()->forget('password_hash_web');
    $this->actingAs($this->admin)->get('/admin/settings/oauth')->assertOk()->assertSee('Callback URL');
    $this->payload['current_password'] = 'wrong';
    $this->patchJson('/admin/settings/oauth', $this->payload)->assertUnprocessable();
});

test('provider secrets are encrypted, hidden and preserved on blank updates', function () {
    $this->payload['providers']['google'] = ['enabled' => '1', 'client_id' => 'google-client', 'client_secret' => 'never-display-this-secret'];
    $this->actingAs($this->admin)->patch('/admin/settings/oauth', $this->payload)->assertRedirect('/admin/settings/oauth');
    $stored = Setting::query()->where('key', 'settings::security:oauth:google:client_secret')->value('value');
    expect($stored)->not->toBe('never-display-this-secret');
    expect(Crypt::decryptString($stored))->toBe('never-display-this-secret');
    $this->get('/admin/settings/oauth')->assertOk()->assertDontSee('never-display-this-secret');
    $this->getJson('/account/security')->assertOk()->assertJsonMissingPath('providers.0.client_secret');
    $this->payload['providers']['google']['client_secret'] = '';
    $this->patch('/admin/settings/oauth', $this->payload)->assertRedirect('/admin/settings/oauth');
    expect(Setting::query()->where('key', 'settings::security:oauth:google:client_secret')->value('value'))->toBe($stored);
});

test('enabled providers require complete configuration and valid OIDC issuer', function () {
    $this->payload['providers']['discord']['enabled'] = '1';
    $this->actingAs($this->admin)->patchJson('/admin/settings/oauth', $this->payload)->assertUnprocessable();
    $this->payload['providers']['discord']['enabled'] = '0';
    $this->payload['providers']['oidc'] = ['enabled' => '1', 'client_id' => 'oidc-client', 'client_secret' => 'oidc-secret', 'issuer' => 'http://unsafe.example.com'];
    $this->patchJson('/admin/settings/oauth', $this->payload)->assertUnprocessable();
    $this->payload['providers']['oidc']['issuer'] = 'https://sso.example.com/realms/panel';
    $this->patch('/admin/settings/oauth', $this->payload)->assertRedirect('/admin/settings/oauth');
    expect(app(AccountSecuritySettings::class)->provider('oidc')['enabled'])->toBeTrue();
});

test('validation never flashes provider secrets or current passwords to the session', function () {
    $this->payload['providers']['google'] = ['enabled' => '1', 'client_id' => '', 'client_secret' => 'do-not-flash-this'];
    $this->withHeader('Accept', 'text/html')->actingAs($this->admin)->from('/admin/settings/oauth')->patch('/admin/settings/oauth', $this->payload)
        ->assertRedirect('/admin/settings/oauth')->assertSessionHasErrors()
        ->assertSessionMissing('_old_input.providers')->assertSessionMissing('_old_input.current_password');
});

test('an administrator can disable a provider and explicitly clear its secret', function () {
    app(AccountSecuritySettings::class)->set('oauth:github:client_secret', Crypt::encryptString('old-secret'));
    $this->payload['providers']['github']['clear_secret'] = '1';
    $this->payload['passkeys_enabled'] = '0';
    $this->actingAs($this->admin)->patch('/admin/settings/oauth', $this->payload)->assertRedirect('/admin/settings/oauth');
    expect(app(AccountSecuritySettings::class)->get('oauth:github:client_secret'))->toBe('');
    expect(app(AccountSecuritySettings::class)->get('passkeys:enabled'))->toBe('0');
});
