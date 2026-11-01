<?php

namespace Pterodactyl\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;

class FirstRunSetup
{
    public function handle(Request $request, \Closure $next): Response
    {
        if (!config('aquadactyl.setup.completed', true)
            && !config('pterodactyl.load_environment_only', false)
            && $request->isMethod('GET') && !$request->expectsJson()
            && $request->routeIs('index', 'admin.index') && $request->user()?->root_admin) {
            return new RedirectResponse(route('admin.settings.setup', [], false));
        }

        return $next($request);
    }
}
