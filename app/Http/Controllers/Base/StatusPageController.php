<?php

namespace Pterodactyl\Http\Controllers\Base;

use Illuminate\Http\Request;
use Pterodactyl\Http\Controllers\Controller;
use Symfony\Component\HttpFoundation\Response;
use Pterodactyl\Services\Status\StatusPageService;
use Pterodactyl\Services\Integrations\IntegrationSettings;

class StatusPageController extends Controller
{
    public function __invoke(Request $request, IntegrationSettings $settings, StatusPageService $status): Response
    {
        abort_unless($settings->statusEnabled(), 404);
        if ($settings->get('status:visibility', 'signed_in') !== 'public' && !$request->user()) {
            return redirect('/auth/login');
        }

        return response()->view('status.index', $status->snapshot() + [
            'title' => $settings->get('status:title') ?: config('app.name'),
            'description' => $settings->get('status:description'),
        ])->header('Cache-Control', 'no-store, private')->header('X-Robots-Tag', 'noindex, nofollow');
    }
}
