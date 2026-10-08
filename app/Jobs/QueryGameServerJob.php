<?php

namespace Pterodactyl\Jobs;

use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Cache;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Pterodactyl\Services\Servers\GameQuery\GameQueryRunner;
use Pterodactyl\Services\Servers\GameQuery\GameQuerySettingsService;

class QueryGameServerJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;
    public int $timeout = 10;

    public function __construct(public int $serverId, public string $key)
    {
        $this->onQueue('low');
    }

    public function handle(GameQuerySettingsService $settings, GameQueryRunner $runner): void
    {
        try {
            $server = Server::query()->find($this->serverId);
            if (!$server || $server->status || !is_null($server->transfer) || $server->node->isUnderMaintenance()) {
                return;
            }
            $target = $settings->target($server);
            if (!$target || $settings->key($server, $target) !== $this->key) {
                return;
            }
            $result = $runner->query($target);
            $result['checked_at'] = now()->toAtomString();
            $result['game'] = $target['type'];
            Cache::put($this->key, $result, 120);
        } finally {
            Cache::forget($this->key . ':pending');
        }
    }
}
