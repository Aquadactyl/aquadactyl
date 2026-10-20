<?php

namespace Pterodactyl\Services\Updates;

use Illuminate\Support\Facades\View;

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
}
