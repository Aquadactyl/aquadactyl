<?php

namespace Pterodactyl\Services\Accounts;

use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use lbuchs\WebAuthn\WebAuthn;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use lbuchs\WebAuthn\WebAuthnException;
use Pterodactyl\Models\AccountPasskey;
use Illuminate\Validation\ValidationException;

class PasskeyService
{
    public function __construct(private AccountSecuritySettings $settings)
    {
    }

    public static function encode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    public static function decode(string $value): string
    {
        if ($value === '' || strlen($value) > 131072 || !preg_match('/^[A-Za-z0-9_-]+$/D', $value)) {
            throw ValidationException::withMessages(['credential' => 'The passkey response is invalid.']);
        }
        $decoded = base64_decode(strtr($value, '-_', '+/'), true);
        if ($decoded === false || self::encode($decoded) !== $value) {
            throw ValidationException::withMessages(['credential' => 'The passkey response is invalid.']);
        }

        return $decoded;
    }

    private function webauthn(): WebAuthn
    {
        abort_unless($this->settings->passkeysEnabled(), 403, 'Passkeys require HTTPS (or localhost) and must be enabled by an administrator.');

        return new WebAuthn(config('app.name', 'Aquadactyl'), parse_url($this->settings->origin(), PHP_URL_HOST), ['none'], true);
    }

    public function registrationOptions(Request $request, User $user): object
    {
        $webauthn = $this->webauthn();
        $ids = AccountPasskey::query()->where('user_id', $user->id)->pluck('credential_id')->map(fn ($id) => self::decode($id))->all();
        $options = $webauthn->getCreateArgs($user->uuid, $user->email, $user->username, 60, true, true, null, $ids);
        $this->remember($request, $webauthn, 'register', $user);

        return $options;
    }

    public function loginOptions(Request $request): object
    {
        $webauthn = $this->webauthn();
        $options = $webauthn->getGetArgs([], 60, true, true, true, true, true, true);
        $this->remember($request, $webauthn, 'login');

        return $options;
    }

    private function remember(Request $request, WebAuthn $webauthn, string $purpose, ?User $user = null): void
    {
        $request->session()->put('passkey_ceremony', [
            'challenge' => self::encode($webauthn->getChallenge()->getBinaryString()),
            'purpose' => $purpose,
            'user_id' => $user?->id,
            'password_hash' => $user?->password,
            'expires_at' => time() + 300,
        ]);
    }

    private function consume(Request $request, string $purpose, ?User $user = null): string
    {
        $ceremony = $request->session()->pull('passkey_ceremony');
        if (!is_array($ceremony) || ($ceremony['expires_at'] ?? 0) < time() || ($ceremony['purpose'] ?? '') !== $purpose
            || ($ceremony['user_id'] ?? null) !== $user?->id
            || ($user && !hash_equals($ceremony['password_hash'] ?? '', $user->password))
            || !Cache::add('passkey:consumed:' . hash('sha256', $ceremony['challenge']), true, 300)) {
            throw ValidationException::withMessages(['credential' => 'This passkey request has expired. Please try again.']);
        }

        return self::decode($ceremony['challenge']);
    }

    private function clientData(array $response): string
    {
        $clientData = self::decode($response['clientDataJSON']);
        try {
            $data = json_decode($clientData, true, 16, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            $data = [];
        }
        // The library permits domain suffixes. Restrict the ceremony to this exact origin.
        if (($data['origin'] ?? '') !== $this->settings->origin() || ($data['crossOrigin'] ?? false) !== false) {
            throw ValidationException::withMessages(['credential' => 'This passkey belongs to a different panel address.']);
        }

        return $clientData;
    }

    public function register(Request $request, User $user, array $data): AccountPasskey
    {
        $webauthn = $this->webauthn();
        $challenge = $this->consume($request, 'register', $user);
        try {
            $result = $webauthn->processCreate($this->clientData($data['response']), self::decode($data['response']['attestationObject']), $challenge, true, true);
            if (!hash_equals(self::decode($data['id']), $result->credentialId)) {
                throw new \RuntimeException('Credential ID mismatch.');
            }
        } catch (WebAuthnException|\RuntimeException $exception) {
            throw ValidationException::withMessages(['credential' => 'The passkey could not be verified. Please try again.']);
        }

        $id = self::encode($result->credentialId);

        return DB::transaction(function () use ($user, $id, $result, $data) {
            // A password reset or suspension can happen while attestation is verified.
            $currentUser = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            if ($currentUser->suspended_at || !hash_equals($user->password, $currentUser->password)) {
                throw ValidationException::withMessages(['credential' => 'This passkey request has expired. Please try again.']);
            }
            if (AccountPasskey::query()->where('credential_id_hash', hash('sha256', $id))->exists()) {
                throw ValidationException::withMessages(['credential' => 'This passkey has already been registered.']);
            }

            return AccountPasskey::query()->create([
                'user_id' => $currentUser->id, 'name' => $data['name'], 'credential_id' => $id,
                'credential_id_hash' => hash('sha256', $id), 'public_key' => $result->credentialPublicKey,
                'signature_counter' => $result->signatureCounter ?? 0,
                'transports' => $data['response']['transports'] ?? [],
            ]);
        });
    }

    public function authenticate(Request $request, array $data): User
    {
        $webauthn = $this->webauthn();
        $challenge = $this->consume($request, 'login');
        $id = self::encode(self::decode($data['id']));

        return DB::transaction(function () use ($data, $id, $webauthn, $challenge) {
            $key = AccountPasskey::query()->where('credential_id_hash', hash('sha256', $id))->lockForUpdate()->first();
            /** @var User|null $user */
            $user = $key?->user;
            if (!$user || !hash_equals($user->uuid, self::decode($data['response']['userHandle']))) {
                throw ValidationException::withMessages(['credential' => 'This passkey could not sign in to your account.']);
            }
            try {
                $webauthn->processGet($this->clientData($data['response']), self::decode($data['response']['authenticatorData']), self::decode($data['response']['signature']), $key->public_key, $challenge, $key->signature_counter, true, true);
            } catch (WebAuthnException) {
                throw ValidationException::withMessages(['credential' => 'This passkey could not sign in to your account.']);
            }
            $key->update(['signature_counter' => $webauthn->getSignatureCounter() ?? 0, 'last_used_at' => now()]);

            return $user;
        });
    }

    public static function rules(bool $registration = false): array
    {
        $rules = [
            'id' => ['required', 'string', 'max:2048'],
            'response' => ['required', 'array'],
            'response.clientDataJSON' => ['required', 'string', 'max:8192'],
        ];
        if ($registration) {
            return $rules + [
                'name' => ['required', 'string', 'max:100'],
                'response.attestationObject' => ['required', 'string', 'max:131072'],
                'response.transports' => ['sometimes', 'array', 'max:8'],
                'response.transports.*' => ['string', 'in:usb,nfc,ble,internal,hybrid,smart-card'],
            ];
        }

        return $rules + [
            'response.authenticatorData' => ['required', 'string', 'max:8192'],
            'response.signature' => ['required', 'string', 'max:2048'],
            'response.userHandle' => ['required', 'string', 'max:256'],
        ];
    }
}
