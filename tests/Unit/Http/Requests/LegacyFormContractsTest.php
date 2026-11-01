<?php

use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Validator;
use Pterodactyl\Http\Requests\Api\Client\Account\StoreApiKeyRequest;
use Pterodactyl\Http\Requests\Api\Client\Account\StoreSSHKeyRequest;
use Pterodactyl\Http\Requests\Api\Client\Account\UpdateEmailRequest;
use Pterodactyl\Http\Requests\Api\Client\Account\UpdatePasswordRequest;

test('legacy account forms with added server permissions reject missing route resources before checking passwords', function (bool $email) {
    $request = $email ? new class extends UpdateEmailRequest {
        public function permission(): string
        {
            return 'control.console';
        }
    }
    : new class extends UpdatePasswordRequest {
        public function permission(): string
        {
            return 'control.console';
        }
    };
    $route = new Route('POST', '/contract', fn () => null);
    $route->bind(Request::create('/contract'));
    $request->setRouteResolver(fn () => $route);
    expect($request->authorize())->toBeFalse();
})->with([true, false]);

test('non-array API address restrictions are rejected safely without attempting CIDR parsing', function () {
    $request = StoreApiKeyRequest::create('/', 'POST', ['description' => 'Testing', 'allowed_ips' => 'not-an-array']);
    $validator = Validator::make($request->all(), $request->rules());
    $request->withValidator($validator);
    expect($validator->fails())->toBeTrue();
});

test('SSH key validation handles malformed non-string and unloaded public keys safely', function (mixed $key) {
    $request = new class extends StoreSSHKeyRequest {
        public function clearKey(): void
        {
            $this->key = null;
        }
    };
    $request->merge(['name' => 'Testing', 'public_key' => $key]);
    $request->setUserResolver(fn () => User::factory()->make());
    $validator = Validator::make($request->all(), $request->rules());
    $request->setValidator($validator);
    $request->withValidator($validator);
    expect($validator->fails())->toBeTrue();
    $request->clearKey();
    expect(fn () => $request->getKeyFingerprint())->toThrow(Exception::class, 'not properly loaded');
})->with([[[]], ['ssh-ed25519 AAAAinvalid']]);

test('remote SFTP normalization drops fields outside the authentication contract', function () {
    $request = Pterodactyl\Http\Requests\Api\Remote\SftpAuthenticationFormRequest::create('/', 'POST', ['username' => 'user.server', 'password' => 'password', 'ip' => '192.0.2.1', 'type' => 'password', 'unexpected' => 'drop']);
    expect($request->normalize())->not->toHaveKeys(['unexpected', 'ip'])->toHaveKeys(['username', 'password']);
});

test('disabling CAPTCHA normalizes an unknown existing provider to the supported default', function () {
    config()->set('recaptcha.provider', 'obsolete-provider');
    $request = Pterodactyl\Http\Requests\Admin\Settings\AdvancedSettingsFormRequest::create('/', 'POST', ['recaptcha:provider' => 'disabled']);
    expect($request->normalize()['recaptcha:provider'])->toBe('recaptcha');
});
