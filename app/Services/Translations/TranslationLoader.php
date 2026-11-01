<?php

namespace Pterodactyl\Services\Translations;

use Illuminate\Translation\FileLoader;

class TranslationLoader extends FileLoader
{
    /**
     * Load the messages for the given locale and group.
     *
     * @param string $locale
     * @param string $group
     * @param string|null $namespace
     *
     * @return array
     */
    public function load($locale, $group, $namespace = null)
    {
        if ($this->isUnsafePathSegment($locale)
            || ($group !== '*' && $this->isUnsafePathSegment($group, allowSlashes: true))) {
            return [];
        }

        if ($group === '*' && $namespace === '*') {
            return $this->loadJsonPaths($locale);
        }

        if (is_null($namespace) || $namespace === '*') {
            return $this->loadPaths($this->paths, $locale, $group);
        }

        return $this->loadNamespaced($locale, $group, $namespace);
    }

    /**
     * Load a local path for given locale and group.
     * Supports:
     * 1. Direct JSON group: {path}/{locale}/{group}.json (e.g. panel.json, auth.json, strings.json)
     * 2. Domain JSON group when group has slash: {domain}/{subgroup} in {domain}.json (e.g. admin/ui -> admin.json['ui'])
     * 3. Fallback to PHP files for backward-compatibility with extensions: {path}/{locale}/{group}.php.
     *
     * @param string $locale
     * @param string $group
     *
     * @return array
     */
    protected function loadPaths(array $paths, $locale, $group)
    {
        $output = [];

        foreach ($paths as $path) {
            // 1. Direct JSON file: {path}/{locale}/{group}.json
            if ($this->files->exists($json = "{$path}/{$locale}/{$group}.json")) {
                $decoded = json_decode($this->files->get($json), true);
                if (is_array($decoded)) {
                    $output = array_replace_recursive($output, $decoded);
                    continue;
                }
            }

            // 2. Domain JSON file if group has slash (e.g. admin/ui, dashboard/index, server/users, command/messages)
            if (str_contains($group, '/')) {
                [$domain, $subgroup] = explode('/', $group, 2);
                if ($this->files->exists($domainJson = "{$path}/{$locale}/{$domain}.json")) {
                    $domainData = json_decode($this->files->get($domainJson), true);
                    if (is_array($domainData) && isset($domainData[$subgroup]) && is_array($domainData[$subgroup])) {
                        $output = array_replace_recursive($output, $domainData[$subgroup]);
                        continue;
                    }
                }
            }

            // 3. Fallback to PHP file if present (for extensions or legacy packs)
            if ($this->files->exists($php = "{$path}/{$locale}/{$group}.php")) {
                $output = array_replace_recursive($output, $this->files->getRequire($php));
            } elseif (str_contains($group, '/')) {
                [$domain, $subgroup] = explode('/', $group, 2);
                if ($this->files->exists($domainPhp = "{$path}/{$locale}/{$domain}.php")) {
                    $domainData = $this->files->getRequire($domainPhp);
                    if (is_array($domainData) && isset($domainData[$subgroup]) && is_array($domainData[$subgroup])) {
                        $output = array_replace_recursive($output, $domainData[$subgroup]);
                    }
                }
            }
        }

        return $output;
    }
}
