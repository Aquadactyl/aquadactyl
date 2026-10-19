<?php

namespace Pterodactyl\Services\Blueprint;

use Symfony\Component\Yaml\Yaml;

class BlueprintArchive
{
    public function inspect(string $path): string
    {
        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) {
            throw new \RuntimeException('The package must be a valid .blueprint ZIP archive.');
        }
        try {
            if ($zip->numFiles > 10000) {
                throw new \RuntimeException('The package contains too many files.');
            }
            $total = 0;
            $manifests = [];
            for ($i = 0; $i < $zip->numFiles; ++$i) {
                $entry = $zip->statIndex($i);
                $name = $entry['name'];
                $zip->getExternalAttributesIndex($i, $os, $attributes);
                if (str_starts_with($name, '/') || str_contains($name, '\\') || str_contains($name, ':') || str_contains($name, "\0")
                    || preg_match('#(?:^|/)\.\.?(/|$)#', $name) || (($attributes >> 16) & 0170000) === 0120000) {
                    throw new \RuntimeException('The package contains unsafe paths or symbolic links.');
                }
                $total += $entry['size'];
                if ($total > 536870912) {
                    throw new \RuntimeException('The expanded package exceeds 512 MiB.');
                }
                if (basename($name) === 'conf.yml') {
                    if ($entry['size'] > 65536) {
                        throw new \RuntimeException('The package manifest is too large.');
                    }
                    $manifests[] = $name;
                }
            }
            if (count($manifests) !== 1) {
                throw new \RuntimeException('The package must contain exactly one conf.yml.');
            }
            $config = Yaml::parse($zip->getFromName($manifests[0]));
            $identifier = $config['info']['identifier'] ?? '';
            if (!is_string($identifier) || !preg_match('/\A[a-z][a-z0-9_]{1,63}\z/', $identifier) || $identifier === 'blueprint') {
                throw new \RuntimeException('The extension identifier is invalid or reserved.');
            }

            return $identifier;
        } finally {
            $zip->close();
        }
    }
}
