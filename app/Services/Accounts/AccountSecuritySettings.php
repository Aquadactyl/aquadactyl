<?php

namespace Pterodactyl\Services\Accounts;

use Pterodactyl\Models\Setting;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Contracts\Encryption\DecryptException;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

class AccountSecuritySettings
{
    public const PROVIDERS = ['discord' => 'Discord', 'github' => 'GitHub', 'google' => 'Google', 'oidc' => 'OpenID Connect'];

    private ?array $values = null;

    public function __construct(private SettingsRepositoryInterface $settings)
    {
    }

    public function get(string $key, string $default = ''): string
    {
        // A fresh service reads all settings once, avoiding a query per provider field.
        $this->values ??= Setting::query()->where('key', 'like', 'settings::security:%')->pluck('value', 'key')->all();

        return $this->values['settings::security:' . $key] ?? $default;
    }

    public function set(string $key, string $value): void
    {
        $this->settings->set('settings::security:' . $key, $value);
        $this->values = null;
    }

    public function refresh(): void
    {
        $this->values = null;
    }

    public function origin(): string
    {
        $parts = parse_url(config('app.url'));
        $scheme = $parts['scheme'] ?? '';
        $host = strtolower($parts['host'] ?? '');
        if (!$host || !in_array($scheme, ['http', 'https'], true) || isset($parts['user']) || isset($parts['pass'])) {
            throw new \RuntimeException('APP_URL must be an absolute panel URL.');
        }

        $port = $parts['port'] ?? null;

        return $scheme . '://' . $host . ($port && $port !== ($scheme === 'https' ? 443 : 80) ? ':' . $port : '');
    }

    public function passkeysEnabled(): bool
    {
        $origin = $this->origin();

        return $this->get('passkeys:enabled', '1') === '1'
            && (str_starts_with($origin, 'https://') || parse_url($origin, PHP_URL_HOST) === 'localhost');
    }

    public function provider(string $id): array
    {
        abort_unless(isset(self::PROVIDERS[$id]), 404);
        $prefix = 'oauth:' . $id . ':';
        $encrypted = $this->get($prefix . 'client_secret');
        try {
            $secret = $encrypted === '' ? '' : Crypt::decryptString($encrypted);
        } catch (DecryptException) {
            $secret = '';
        }
        $issuer = $id === 'oidc' ? $this->get($prefix . 'issuer') : $id;
        $clientId = $this->get($prefix . 'client_id');

        return [
            'id' => $id,
            'label' => $id === 'oidc' ? ($this->get($prefix . 'label') ?: self::PROVIDERS[$id]) : self::PROVIDERS[$id],
            'enabled' => $this->get($prefix . 'enabled') === '1' && $clientId !== '' && $secret !== '' && $issuer !== '',
            'client_id' => $clientId,
            'client_secret' => $secret,
            'has_secret' => $encrypted !== '',
            'issuer' => $issuer,
            'redirect' => $this->origin() . '/auth/oauth/' . $id . '/callback',
        ];
    }

    public function publicProviders(): array
    {
        $providers = [];
        foreach (array_keys(self::PROVIDERS) as $id) {
            $provider = $this->provider($id);
            if ($provider['enabled']) {
                $providers[] = ['id' => $id, 'label' => $provider['label']];
            }
        }

        return $providers;
    }
}
