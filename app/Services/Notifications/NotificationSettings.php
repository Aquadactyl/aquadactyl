<?php

namespace Pterodactyl\Services\Notifications;

use Pterodactyl\Models\Setting;

class NotificationSettings
{
    public function get(): array
    {
        // Queue workers must see an administrator's changes without retaining old configuration.
        $values = Setting::whereIn('key', ['settings::integrations:notifications:enabled', 'settings::integrations:notifications:discord_enabled'])->pluck('value', 'key');

        return [
            'enabled' => ($values['settings::integrations:notifications:enabled'] ?? '1') === '1',
            'discord_enabled' => ($values['settings::integrations:notifications:discord_enabled'] ?? '0') === '1',
        ];
    }
}
