<?php

namespace Pterodactyl\Jobs;

use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Pterodactyl\Services\Webhooks\WebhookTransport;
use Pterodactyl\Services\Webhooks\WebhookDeliveryService;

class DeliverWebhook implements ShouldQueue, ShouldBeUnique
{
    use Queueable;

    public int $uniqueFor = 300;
    public int $tries = 1;

    public function __construct(public int $deliveryId)
    {
        $this->onQueue('low');
    }

    public function uniqueId(): string
    {
        return 'webhook:' . $this->deliveryId;
    }

    public function handle(WebhookDeliveryService $service, WebhookTransport $transport): void
    {
        $service->deliver($this->deliveryId, $transport);
    }
}
