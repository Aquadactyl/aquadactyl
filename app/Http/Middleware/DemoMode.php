<?php

namespace Pterodactyl\Http\Middleware;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DemoMode
{
    public function handle(Request $request, \Closure $next): Response
    {
        if (!config('aquadactyl.demo.enabled', false)) {
            return $next($request);
        }

        $path = '/' . ltrim(preg_replace('#/+#', '/', rawurldecode($request->getPathInfo())), '/');
        if (is_file(config('aquadactyl.demo.reset_marker')) && !str_starts_with($path, '/api/remote/')) {
            abort(503, 'The demonstration is returning to its default state. Please reload in a few seconds.', ['Retry-After' => '5']);
        }
        $read = $request->isMethod('GET') || $request->isMethod('HEAD');
        $allowed = str_starts_with($path, '/api/remote/');

        if ($read) {
            // Node configuration contains the daemon's administrative credential.
            // Deny all application API access, token minting, logs and addon code.
            $sensitive = preg_match('#^/(?:api/application(?:/|$)|admin/(?:nodes/view/[^/]+/(?:configuration|settings/token)|settings/logs|extensions/[^/]+|blueprint|api)(?:/|$))#i', $path)
                || preg_match('#^/api/client/(?:servers/[^/]+/files/upload|account/(?:api-keys|ssh-keys))(?:/|$)#i', $path);
            $allowed = !$sensitive;
        } elseif (in_array($path, ['/auth/login', '/auth/logout'], true) && $request->isMethod('POST')) {
            $allowed = true;
        } elseif (preg_match('#^/api/client/servers/[a-zA-Z0-9_-]+/(?:power|command)$#D', $path) && $request->isMethod('POST')) {
            $allowed = true;
        } elseif (preg_match('#^/api/client/account/server-folders(?:/[a-zA-Z0-9_-]+){0,2}$#D', $path)) {
            $allowed = true;
        } elseif ($request->isMethod('POST') && preg_match('#^/api/client/servers/[a-zA-Z0-9_-]+/files/write$#D', $path)) {
            // The fixed startup files remain immutable; visitors can try editing
            // the demonstration notes without uploading executable code.
            $allowed = $request->query('file') === '/welcome.txt' && strlen($request->getContent()) <= 65536;
        }

        abort_unless($allowed, 403, 'This action is protected in the public demo. You can explore the admin pages, use server power controls and edit welcome.txt. The demo resets every five minutes.');

        $response = $next($request);
        $response->headers->set('X-Aquadactyl-Demo', 'true');

        return $response;
    }
}
