<?php

namespace Pterodactyl\Services\Updates;

use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Cache;

class ReleaseNotes
{
    public function installedVersion(): string
    {
        $version = (string) config('app.version');
        if ($version !== 'canary') {
            return mb_substr($version, 0, 100);
        }
        $file = base_path('.aquadactyl-build');
        $build = is_file($file) ? trim(file_get_contents($file)) : (string) View::shared('appVersion');

        return preg_match('/^[a-f0-9]{8,64}$/D', $build) ? 'canary+' . substr($build, 0, 12) : 'canary';
    }

    public function installed(): string
    {
        $path = base_path('CHANGELOG.md');
        if (!is_file($path)) {
            return '';
        }
        $version = (string) config('app.version');

        return Cache::remember('installed-notes:' . hash('sha256', $version . ':' . filemtime($path) . ':' . filesize($path)), 3600, function () use ($path, $version) {
            $text = file_get_contents($path, false, null, 0, 2097152);
            preg_match_all('/^## ([^\r\n]+)\R(.*?)(?=^## |\z)/ms', $text, $sections, PREG_SET_ORDER);
            foreach ($sections as $section) {
                if (($version === 'canary' && str_starts_with(strtolower($section[1]), 'unreleased')) || ltrim(trim($section[1]), 'v') === ltrim($version, 'v')) {
                    return mb_substr(trim($section[2]), 0, 16000);
                }
            }

            return '';
        });
    }
}
