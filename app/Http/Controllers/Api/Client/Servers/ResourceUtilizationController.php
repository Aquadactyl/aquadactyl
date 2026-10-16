<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Pterodactyl\Models\Server;
use Illuminate\Cache\Repository;
use Pterodactyl\Transformers\Api\Client\StatsTransformer;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Http\Requests\Api\Client\Servers\GetServerRequest;

class ResourceUtilizationController extends ClientApiController
{
    /**
     * ResourceUtilizationController constructor.
     */
    public function __construct(private Repository $cache, private DaemonServerRepository $repository)
    {
        parent::__construct();
    }

    /**
     * Return the current resource utilization for a server. This value is cached for up to
     * 20 seconds for running servers, and two seconds while stopped, transitioning or
     * following a power action. A separate cache prevents an older in-flight request
     * from replacing the fresh status after a power action.
     *
     * @throws \Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException
     */
    public function __invoke(GetServerRequest $request, Server $server): array
    {
        $recentPower = $this->cache->has("resources:power:$server->uuid");
        $key = "resources:$server->uuid" . ($recentPower ? ':power' : '');
        $stats = $this->cache->get($key);
        if ($stats === null) {
            $stats = $this->repository->setServer($server)->getDetails();
            $ttl = !$recentPower && ($stats['state'] ?? null) === 'running' ? 20 : 2;
            $this->cache->put($key, $stats, $ttl);
        }

        return $this->fractal->item($stats)
            ->transformWith($this->getTransformer(StatsTransformer::class))
            ->toArray();
    }
}
