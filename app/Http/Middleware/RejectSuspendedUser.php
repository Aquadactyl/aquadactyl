<?php

namespace Pterodactyl\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RejectSuspendedUser
{
    public function handle(Request $request, \Closure $next): Response
    {
        if (!$request->user()?->suspended_at || $request->is('auth/logout')) {
            return $next($request);
        }
        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return $request->expectsJson()
            ? response()->json(['errors' => [['code' => 'AccountSuspended', 'status' => '403', 'detail' => __('admin/management.account_suspended_help')]]], 403)->header('Cache-Control', 'no-store')
            : response()->view('errors.account-suspended', [], 403)->header('Cache-Control', 'no-store');
    }
}
