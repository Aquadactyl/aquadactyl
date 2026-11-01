<?php

namespace Pterodactyl\Listeners\Notifications;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Events\ActivityLogged;
use Pterodactyl\Jobs\RecordServerNotifications;
use Pterodactyl\Services\Notifications\ServerNotificationService;

class QueueServerNotification
{
    public function handle(ActivityLogged $event): void
    {
        if (ServerNotificationService::event($event->model->event)) {
            DB::afterCommit(function () use ($event) {
                try {
                    RecordServerNotifications::dispatch($event->model->id);
                } catch (\Throwable) {
                    Log::warning('An account notification could not be queued. Check the queue configuration.');
                }
            });
        }
    }
}
