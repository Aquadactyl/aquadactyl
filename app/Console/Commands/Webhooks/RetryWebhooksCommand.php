<?php

namespace Pterodactyl\Console\Commands\Webhooks;

use Illuminate\Console\Command;
use Pterodactyl\Services\Webhooks\WebhookEmitter;
use Pterodactyl\Services\Webhooks\WebhookDeliveryService;

class RetryWebhooksCommand extends Command
{
    protected $signature = 'p:webhooks:retry';
    protected $description = 'Queue due webhook deliveries, recover interrupted sends and prune old delivery history.';

    public function handle(WebhookDeliveryService $service, WebhookEmitter $emitter): int
    {
        $service->retryPending($emitter);

        return self::SUCCESS;
    }
}
