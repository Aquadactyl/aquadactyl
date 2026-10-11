<?php

namespace Pterodactyl\Services\Telemetry;

use Ramsey\Uuid\Uuid;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\User;
use Illuminate\Support\Facades\Http;
use Pterodactyl\Repositories\Eloquent\SettingsRepository;

class AquadactylTelemetryCollectionService
{
    public function __construct(private SettingsRepository $settings)
    {
    }

    public function __invoke(): void
    {
        $endpoint = config('aquadactyl.telemetry.endpoint');
        $token = config('aquadactyl.telemetry.token');
        if (!config('aquadactyl.telemetry.enabled') || !$endpoint || !$token) {
            return;
        }

        try {
            Http::withToken($token)->connectTimeout(5)->timeout(10)->post($endpoint, $this->collect())->throw();
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    public function collect(): array
    {
        $instanceId = $this->settings->get('app:telemetry:aquadactyl_uuid');
        if (!$instanceId) {
            $instanceId = Uuid::uuid4()->toString();
            $this->settings->set('app:telemetry:aquadactyl_uuid', $instanceId);
        }

        return [
            'schema' => 1,
            'instanceId' => $instanceId,
            'panel' => [
                'version' => (string) config('app.version'),
                'phpVersion' => PHP_VERSION,
                'databaseDriver' => (string) config('database.default'),
                'cacheDriver' => (string) config('cache.default'),
                'queueDriver' => (string) config('queue.default'),
                'docker' => is_file('/.dockerenv'),
            ],
            'resources' => [
                'users' => User::count(),
                'servers' => Server::count(),
                'nodes' => Node::count(),
            ],
        ];
    }
}
