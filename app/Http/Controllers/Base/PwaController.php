<?php

namespace Pterodactyl\Http\Controllers\Base;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\Settings\PwaService;
use Pterodactyl\Services\Settings\SiteBrandingService;

class PwaController extends Controller
{
    public function worker(SiteBrandingService $branding): Response
    {
        $source = file_get_contents(resource_path(app(PwaService::class)->offlineEnabled() ? 'pwa/service-worker.js' : 'pwa/unregister-worker.js'));
        $revision = $branding->version() . '-' . substr(hash('sha256', $source . file_get_contents(resource_path('views/pwa/offline.blade.php')) . json_encode(array_map(fn ($locale) => trans('setup', [], $locale), ['en', 'fr', 'de']), JSON_THROW_ON_ERROR)), 0, 12);

        return response('const CACHE = "aquadactyl-offline-' . $revision . '";' . PHP_EOL . $source, 200, [
            'Content-Type' => 'application/javascript; charset=UTF-8',
            'Service-Worker-Allowed' => '/',
            'Cache-Control' => 'no-store',
        ]);
    }

    public function offline(Request $request): Response
    {
        abort_unless(app(PwaService::class)->offlineEnabled(), 404);
        $locale = $request->query('lang');
        $locale = in_array($locale, ['en', 'fr', 'de'], true) ? $locale : 'en';

        // This route has no session middleware and contains no account or server data.
        return response()->view('pwa.offline', ['locale' => $locale], 200, ['Cache-Control' => 'public, max-age=0, must-revalidate']);
    }
}
