<?php

namespace Pterodactyl\Jobs;

use Pterodactyl\Models\ActivityLog;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Pterodactyl\Services\Notifications\ServerNotificationService;

class RecordServerNotifications implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(public int $activityId)
    {
        $this->onQueue('low');
    }

    public function handle(ServerNotificationService $service): void
    {
        if ($activity = ActivityLog::find($this->activityId)) {
            $service->record($activity);
        }
    }
}
