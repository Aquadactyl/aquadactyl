<?php

namespace Pterodactyl\Services\Updates;

final class SoftwareVersion
{
    /** @return array{version: string, prerelease: bool}|null */
    public static function parse(string $version): ?array
    {
        if (strlen($version) > 100 || !preg_match('/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:-(alpha|beta|rc)(?:[.-]?(0|[1-9]\d*))?)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/iD', $version, $parts, PREG_UNMATCHED_AS_NULL)) {
            return null;
        }

        $normalized = $parts[1] . '.' . $parts[2] . '.' . ($parts[3] ?? '0');
        if ($parts[4] !== null) {
            $normalized .= '-' . strtolower($parts[4]) . ($parts[5] !== null ? '.' . $parts[5] : '');
        }

        return ['version' => $normalized, 'prerelease' => $parts[4] !== null];
    }

    public static function isPrerelease(string $version): bool
    {
        return self::parse($version)['prerelease'] ?? false;
    }

    public static function newer(string $installed, string $latest): bool
    {
        $current = self::parse($installed);
        $candidate = self::parse($latest);

        return $current !== null && $candidate !== null && version_compare($candidate['version'], $current['version'], '>');
    }
}
