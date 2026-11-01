<?php

namespace Pterodactyl\Services\Webhooks;

use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Jobs\DeliverWebhook;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\WebhookDelivery;
use Pterodactyl\Models\WebhookEndpoint;

class WebhookEmitter
{
    public static function group(string $event): string
    {
        return match (true) {
            $event === 'system.action' => 'system',
            str_starts_with($event, 'status.health.') => 'status.health',
            str_starts_with($event, 'status.incident.') => 'status.incident',
            $event === 'updates.available', $event === 'updates.installed' => $event,
            default => '',
        };
    }

    public function emit(string $event, array $data, ?string $eventId = null): void
    {
        try {
            $group = self::group($event);
            if (!$this->subscribed($group)) {
                return;
            }
            $eventId ??= Str::uuid()->toString();
            foreach (WebhookEndpoint::where('enabled', true)->whereJsonContains('events', $group)->get(['id', 'revision']) as $endpoint) {
                $this->store($endpoint, $event, $data, $eventId);
            }
        } catch (\Throwable) {
            // Notification infrastructure must never stop the action being reported.
            Log::warning('A webhook event could not be queued. Check the webhook database and queue configuration.');
        }
    }

    public function subscribed(string $group): bool
    {
        return in_array($group, WebhookEndpoint::GROUPS, true)
            && Cache::remember('webhook-subscription:' . $group, 60, fn () => WebhookEndpoint::where('enabled', true)->whereJsonContains('events', $group)->exists());
    }

    public function test(WebhookEndpoint $endpoint): void
    {
        $this->store($endpoint, 'webhook.test', ['message' => 'Aquadactyl webhook configuration test.'], Str::uuid()->toString());
    }

    private function store(WebhookEndpoint $endpoint, string $event, array $data, string $eventId): void
    {
        $delivery = WebhookDelivery::firstOrCreate([
            'webhook_endpoint_id' => $endpoint->id, 'endpoint_revision' => $endpoint->revision, 'event_id' => $eventId,
        ], [
            'uuid' => Str::uuid()->toString(), 'event_type' => $event, 'status' => 'pending', 'next_attempt_at' => now(),
            'payload' => ['schema' => 1, 'id' => $eventId, 'event' => $event, 'occurred_at' => now()->toIso8601String(), 'data' => $data],
        ]);
        if ($delivery->wasRecentlyCreated) {
            $this->queue($delivery->id);
        }
    }

    public function queue(int $id): void
    {
        DB::afterCommit(function () use ($id) {
            try {
                DeliverWebhook::dispatch($id);
            } catch (\Throwable) {
                Log::warning('A webhook delivery is waiting for queue recovery.');
            }
        });
    }

    public static function clearSubscriptions(): void
    {
        foreach (WebhookEndpoint::GROUPS as $group) {
            Cache::forget('webhook-subscription:' . $group);
        }
    }
}
