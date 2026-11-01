<?php

namespace Pterodactyl\Console\Commands\Discord;

use Illuminate\Console\Command;
use Pterodactyl\Services\Discord\DiscordRoleSyncService;

class SyncDiscordRolesCommand extends Command
{
    protected $signature = 'p:discord:sync-roles';

    protected $description = 'Queue reconciliation of linked Discord accounts and Aquadactyl-managed roles.';

    public function handle(DiscordRoleSyncService $service): int
    {
        $service->queueAll();

        return self::SUCCESS;
    }
}
