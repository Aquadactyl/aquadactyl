<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Illuminate\Http\Response;
use Pterodactyl\Models\Server;
use Pterodactyl\Facades\Activity;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Repositories\Wings\DaemonPowerRepository;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Http\Requests\Api\Client\Servers\SendPowerRequest;
use Pterodactyl\Services\Servers\GameQuery\GameQuerySettingsService;

class PowerController extends ClientApiController
{
    /**
     * PowerController constructor.
     */
    public function __construct(private DaemonPowerRepository $repository)
    {
        parent::__construct();
    }

    /**
     * Send a power action to a server.
     */
    public function index(SendPowerRequest $request, Server $server, GameQuerySettingsService $queries): Response
    {
        $this->repository->setServer($server)->send(
            $request->input('signal')
        );
        Cache::forget("resources:$server->uuid");
        if ($target = $queries->target($server)) {
            Cache::forget($queries->key($server, $target));
        }

        Activity::event(strtolower("server:power.{$request->input('signal')}"))->log();

        return $this->returnNoContent();
    }
}
