<?php

namespace Pterodactyl\Services\Blueprint;

class BlueprintExtensionRegistry
{
    public function installed(string $identifier): bool
    {
        // Match the identifiers accepted by Blueprint's removal command, never paths or flags.
        if (!preg_match('/\A[a-z]{1,48}\z/', $identifier) || $identifier === 'blueprint') {
            return false;
        }

        $directory = base_path('.blueprint/extensions/' . $identifier);
        $manifest = $directory . '/private/.store/conf.yml';
        $registry = base_path('.blueprint/extensions/blueprint/private/db/installed_extensions');

        return !is_link($directory) && is_dir($directory) && !is_link($manifest) && is_file($manifest)
            && !is_link($registry) && is_file($registry) && str_contains((string) @file_get_contents($registry), '|' . $identifier . ',');
    }
}
