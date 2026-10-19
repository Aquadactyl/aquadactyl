<?php

namespace Pterodactyl\Http\Middleware;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PanelMaintenance
{
    public function handle(Request $request, \Closure $next): Response
    {
        // Sign-in remains available so administrators can end maintenance.
        if (!config('aquadactyl.maintenance.enabled') || $request->user()?->root_admin
            || $request->is('auth/login', 'auth/login/*', 'auth/password', 'auth/password/*', 'auth/methods', 'auth/passkeys/*', 'auth/oauth/*', 'auth/logout', 'locales/*', 'assets/*')) {
            return $next($request);
        }

        $message = config('aquadactyl.maintenance.message') ?: __('admin/operations.maintenance_default');
        $headers = ['Retry-After' => '60', 'Cache-Control' => 'no-store'];

        return $request->expectsJson()
            ? response()->json(['errors' => [['code' => 'PanelMaintenance', 'status' => '503', 'detail' => $message]]], 503, $headers)
            : response()->view('errors.panel-maintenance', ['message' => $message], 503, $headers);
    }
}
