<?php

namespace Pterodactyl\Console\Commands\Users;

use Illuminate\Console\Command;
use Pterodactyl\Services\Users\UserSuspensionService;

class SyncUserSuspensions extends Command
{
    protected $signature = 'p:users:sync-suspensions';

    protected $description = 'Retry pending account suspension changes on daemons.';

    public function handle(UserSuspensionService $service): int
    {
        $service->retryPending();

        return self::SUCCESS;
    }
}
