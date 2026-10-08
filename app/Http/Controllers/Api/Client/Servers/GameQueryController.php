<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Jobs\QueryGameServerJob;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Http\Requests\Api\Client\Servers\GetServerRequest;
use Pterodactyl\Services\Servers\GameQuery\GameQuerySettingsService;

class GameQueryController extends ClientApiController
{
    public function __invoke(GetServerRequest $request, Server $server, GameQuerySettingsService $settings): array
    {
        $target = $settings->target($server);
        $result = ['status' => 'unsupported', 'players' => null, 'max_players' => null, 'checked_at' => null, 'game' => null];
        if ($target) {
            $key = $settings->key($server, $target);
            $result = Cache::get($key) ?? array_merge($result, ['status' => 'pending', 'game' => $target['type']]);
            $age = $result['checked_at'] ? now()->diffInSeconds($result['checked_at'], true) : PHP_INT_MAX;
            if ($age >= config('game-query.cache_seconds') && Cache::add($key . ':pending', true, 120)) {
                $job = new QueryGameServerJob($server->id, $key);
                if (config('queue.default') === 'sync') {
                    dispatch($job)->afterResponse();
                } else {
                    dispatch($job);
                }
            }
        }

        return ['object' => 'game_query', 'attributes' => $result];
    }
}
