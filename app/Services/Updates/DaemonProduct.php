<?php

namespace Pterodactyl\Services\Updates;

final class DaemonProduct
{
    public static function identify(array $info, string $override = 'auto'): string
    {
        if (in_array($override, ['manta', 'wings'], true)) {
            return $override;
        }
        if (array_key_exists('product', $info)) {
            $product = is_string($info['product']) ? strtolower(trim($info['product'])) : null;

            return in_array($product, ['manta', 'wings'], true) ? $product : 'unknown';
        }

        $version = is_string($info['version'] ?? null) ? $info['version'] : '';
        if (preg_match('/(?:^manta[ -]|-manta(?:$|[.+-]))/i', $version)) {
            return 'manta';
        }
        // Published Manta betas before the product field expose this capability
        // and use two-component beta tags. Wings releases use three components.
        if (preg_match('/^v?\d+\.\d+-beta(?:\.\d+)?$/D', $version) && ($info['capabilities']['system_usage'] ?? false) === true) {
            return 'manta';
        }

        return preg_match('/^v?\d+\.\d+\.\d+(?:[-+]|$)/D', $version) && SoftwareVersion::parse($version) !== null ? 'wings' : 'unknown';
    }
}
