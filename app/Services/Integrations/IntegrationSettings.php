<?php

namespace Pterodactyl\Services\Integrations;

use Pterodactyl\Models\Setting;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Contracts\Encryption\DecryptException;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

class IntegrationSettings
{
    private ?array $values = null;

    public function __construct(private SettingsRepositoryInterface $settings)
    {
    }

    public function get(string $key, string $default = ''): string
    {
        $this->values ??= Setting::where('key', 'like', 'settings::integrations:%')->pluck('value', 'key')->all();

        return $this->values['settings::integrations:' . $key] ?? $default;
    }

    public function set(string $key, string $value): void
    {
        $this->settings->set('settings::integrations:' . $key, $value);
        $this->values = null;
    }

    public function statusEnabled(): bool
    {
        return $this->get('status:enabled') === '1';
    }

    public function discordToken(): string
    {
        try {
            $value = $this->get('discord:bot_token');

            return $value === '' ? '' : Crypt::decryptString($value);
        } catch (DecryptException) {
            return '';
        }
    }

    public function discordEnabled(): bool
    {
        return $this->get('discord:enabled') === '1' && $this->discordToken() !== ''
            && preg_match('/^[1-9][0-9]{16,19}$/D', $this->get('discord:guild_id')) === 1;
    }
}
