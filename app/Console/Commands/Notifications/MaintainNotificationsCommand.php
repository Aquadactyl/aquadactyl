<?php

namespace Pterodactyl\Console\Commands\Notifications;

use Illuminate\Console\Command;
use Pterodactyl\Services\Notifications\NotificationDeliveryService;

class MaintainNotificationsCommand extends Command
{
    protected $signature = 'p:notifications:maintain';
    protected $description = 'Retry pending account Discord alerts and expire notifications after 30 days.';

    public function handle(NotificationDeliveryService $service): void
    {
        $service->maintain();
    }
}
