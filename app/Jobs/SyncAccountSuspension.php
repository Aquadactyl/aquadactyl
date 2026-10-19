<?php

namespace Pterodactyl\Jobs;

use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Pterodactyl\Services\Users\UserSuspensionService;

class SyncAccountSuspension implements ShouldQueue, ShouldBeUnique
{
    use Queueable;

    public int $uniqueFor = 3600;

    public function __construct(public int $serverId)
    {
        $this->onQueue('high');
    }

    public function handle(UserSuspensionService $service): void
    {
        $service->sync($this->serverId);
    }

    public function uniqueId(): string
    {
        return 'account-suspension:' . $this->serverId;
    }
}
