<?php

namespace Pterodactyl\Services\Helpers;

use Illuminate\Foundation\Vite;
use Illuminate\Filesystem\Filesystem;

class ClientAssetService
{
    public function __construct(private Filesystem $files, private Vite $vite)
    {
    }

    /**
     * Discover only the requested router's static module graph. Other routes,
     * addon screens and interactive dialogs remain lazy.
     */
    public function preloads(string $path): array
    {
        $manifestPath = public_path('build/manifest.json');
        if ($this->vite->isRunningHot() || !$this->files->exists($manifestPath)) {
            return [];
        }
        $manifest = json_decode($this->files->get($manifestPath), true) ?? [];
        $router = str_starts_with($path, 'auth/') ? 'AuthenticationRouter'
            : (str_starts_with($path, 'server/') ? 'ServerRouter' : 'DashboardRouter');
        $urls = [];
        $seen = [];
        $visit = function (string $key) use (&$visit, &$seen, &$urls, $manifest): void {
            if (isset($seen[$key]) || !isset($manifest[$key])) {
                return;
            }
            $seen[$key] = true;
            $urls[] = $this->vite->asset($key);
            foreach ($manifest[$key]['imports'] ?? [] as $dependency) {
                $visit($dependency);
            }
        };
        $visit('resources/scripts/routers/' . $router . '.tsx');

        return array_values(array_unique($urls));
    }
}
