<?php

namespace Pterodactyl\Jobs;

use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Pterodactyl\Services\Webhooks\WebhookTransport;
use Pterodactyl\Services\Notifications\NotificationDeliveryService;

class DeliverAccountNotification implements ShouldQueue, ShouldBeUnique
{
    use Queueable;

    public int $tries = 1;
    public int $uniqueFor = 300;

    public function __construct(public int $notificationId)
    {
        $this->onQueue('low');
    }

    public function uniqueId(): string
    {
        return 'account-notification:' . $this->notificationId;
    }

    public function handle(NotificationDeliveryService $service, WebhookTransport $transport): void
    {
        $service->deliver($this->notificationId, $transport);
    }
}
