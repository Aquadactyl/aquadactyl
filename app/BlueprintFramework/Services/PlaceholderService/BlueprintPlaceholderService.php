<?php

namespace Pterodactyl\BlueprintFramework\Services\PlaceholderService;

class BlueprintPlaceholderService
{
    protected const VERSION = 'beta-2026-08';

    public function version(): string
    {
        $ver = static::VERSION;
        // Keep this check intact when the installer replaces the version token.
        if (str_starts_with($ver, '::')) {
            return 'unknown';
        }

        return $ver;
    }

    public function folder(): string
    {
        return base_path();
    }

    public function installed(): string
    {
        return 'INSTALLED';
    }

    public function api_url(): string
    {
        return 'https://blueprint.zip';
    }
}
