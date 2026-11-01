<?php

namespace Pterodactyl\Http\Middleware\Activity;

use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Pterodactyl\Facades\Activity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Database\Eloquent\Relations\Relation;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class LogAdminActions
{
    public function handle(Request $request, \Closure $next): Response
    {
        $actor = $request->user();
        if ($request->isMethodSafe() || !$actor instanceof User || !$actor->root_admin) {
            return $next($request);
        }
        try {
            $response = $next($request);
        } catch (\Throwable $exception) {
            $status = $exception instanceof HttpExceptionInterface ? $exception->getStatusCode() : ($exception instanceof ValidationException ? 422 : 500);
            $this->record($request, $actor, $status);
            throw $exception;
        }
        $this->record($request, $actor, $response->getStatusCode());

        return $response;
    }

    private function record(Request $request, User $actor, int $status): void
    {
        // Store route templates and identifiers, never request bodies, headers,
        // query strings, passwords, OAuth tokens or child-process output.
        $route = $request->route();
        $activity = Activity::event('admin:request')->actor($actor)->property([
            'route' => $route->getName() ?? $route->uri(), 'method' => $request->method(),
            'status' => $status, 'result' => $status >= 400 ? 'rejected' : 'processed',
        ]);
        foreach ($route->parameters() as $subject) {
            if ($subject instanceof Model && in_array($subject::class, Relation::morphMap(), true)) {
                $activity->subject($subject);
            }
        }
        $activity->log();
    }
}
