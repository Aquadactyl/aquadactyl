<?php

namespace Pterodactyl\Console\Commands\Status;

use Illuminate\Console\Command;
use Pterodactyl\Services\Status\StatusPageService;
use Pterodactyl\Services\Integrations\IntegrationSettings;

class CollectStatusCommand extends Command
{
    protected $signature = 'p:status:collect';

    protected $description = 'Collect published node health and retain 30 days of status samples.';

    public function handle(StatusPageService $status, IntegrationSettings $settings): int
    {
        $status->collect($settings);

        return self::SUCCESS;
    }
}
