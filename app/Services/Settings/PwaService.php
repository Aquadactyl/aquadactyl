<?php

namespace Pterodactyl\Services\Settings;

class PwaService
{
    public function enabled(): bool
    {
        return (bool) config('aquadactyl.pwa.enabled', true);
    }

    public function offlineEnabled(): bool
    {
        return $this->enabled() && (bool) config('aquadactyl.pwa.offline_enabled', true);
    }

    public function appName(): string
    {
        $name = trim((string) config('aquadactyl.pwa.app_name', ''));

        return $name !== '' ? $name : config('app.name', 'Aquadactyl');
    }

    public function shortName(): string
    {
        $name = trim((string) config('aquadactyl.pwa.short_name', ''));

        return $name !== '' ? $name : mb_substr($this->appName(), 0, 30);
    }
}
