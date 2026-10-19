<?php

namespace Pterodactyl\Listeners\Webhooks;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Events\ActivityLogged;
use Pterodactyl\Services\Webhooks\WebhookEmitter;

class SendSystemActionWebhook
{
    public function handle(ActivityLogged $event): void
    {
        $activity = $event->model;
        $action = $activity->event;
        if (!preg_match('/^(admin:|server:(?:create|delete|power\.|backup\.|reinstall|suspend)|discord:role\.)/', $action)) {
            return;
        }
        $route = $activity->properties?->get('route');
        if ($action === 'admin:request' && is_string($route) && (str_starts_with($route, 'admin.settings.webhooks') || str_starts_with($route, 'admin/settings/webhooks'))) {
            return;
        }
        DB::afterCommit(function () use ($activity, $action) {
            try {
                $emitter = app(WebhookEmitter::class);
                if (!$emitter->subscribed('system')) {
                    return;
                }
                // Subjects are attached after ActivityLogged fires, before the transaction commits.
                $subjects = $activity->subjects()->limit(20)->get(['subject_type', 'subject_id'])->map(fn ($subject) => ['type' => $subject->subject_type, 'id' => $subject->subject_id])->all();
                $metadata = $action === 'admin:request' ? collect($activity->properties)->only(['route', 'method', 'status'])->filter(fn ($value) => is_scalar($value))->all() : [];
                $emitter->emit('system.action', ['action' => $action, 'activity_id' => $activity->id, 'actor_id' => $activity->actor_id, 'subjects' => $subjects] + $metadata);
            } catch (\Throwable) {
                Log::warning('A system-action webhook could not be recorded.');
            }
        });
    }
}
