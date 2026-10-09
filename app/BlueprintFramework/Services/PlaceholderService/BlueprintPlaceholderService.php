<?php

namespace Pterodactyl\BlueprintFramework\Services\PlaceholderService;

class BlueprintPlaceholderService
{
    public function version(): string
    {
        $ver = 'beta-2026-08';
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
