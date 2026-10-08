<?php

namespace Pterodactyl\Http\Controllers\Base;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\Settings\SiteBrandingService;

class SiteBrandingController extends Controller
{
    public function __construct(private SiteBrandingService $branding)
    {
    }

    public function icon(Request $request, int $size): Response
    {
        return $this->respond($request, $this->branding->icon($size), 'image/png');
    }

    public function favicon(Request $request): Response
    {
        return $this->respond($request, $this->branding->favicon(), 'image/vnd.microsoft.icon');
    }

    public function mask(Request $request): Response
    {
        return $this->respond($request, $this->branding->mask(), 'image/svg+xml');
    }

    public function manifest(Request $request): Response
    {
        return $this->respond($request, json_encode($this->branding->manifest(), JSON_THROW_ON_ERROR), 'application/manifest+json');
    }

    public function browserconfig(Request $request): Response
    {
        return $this->respond($request, $this->branding->browserconfig(), 'application/xml');
    }

    private function respond(Request $request, string $contents, string $type): Response
    {
        $response = response($contents, 200, ['Content-Type' => $type, 'Cache-Control' => 'public, max-age=0, must-revalidate']);
        $response->setEtag(hash('sha256', $contents));
        $response->isNotModified($request);

        return $response;
    }
}
