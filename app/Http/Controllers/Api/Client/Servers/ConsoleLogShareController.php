<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Pterodactyl\Models\Server;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Services\Debug\DebugPasteService;
use Pterodactyl\Services\Debug\ConsoleLogRedactor;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Http\Requests\Api\Client\Servers\ShareConsoleLogsRequest;

class ConsoleLogShareController extends ClientApiController
{
    public function __invoke(ShareConsoleLogsRequest $request, Server $server, ConsoleLogRedactor $redactor, DebugPasteService $debug): JsonResponse
    {
        try {
            $url = $debug->upload($redactor->redact($request->validated('content'), $server), 86400);
        } catch (\Throwable) {
            // HTTP exceptions can include the submitted body or an upstream response.
            // Keep them out of application logs and the user's error response.
            return new JsonResponse(['errors' => [['detail' => 'Unable to share console logs. Please try again later.']]], 503);
        }

        // Return the link only to this request. Never send it through the server socket.
        return new JsonResponse(['url' => $url, 'expires_in' => 86400]);
    }
}
