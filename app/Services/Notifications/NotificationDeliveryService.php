<?php

namespace Pterodactyl\Services\Notifications;

use Pterodactyl\Models\User;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\WebhookDelivery;
use Pterodactyl\Models\WebhookEndpoint;
use Pterodactyl\Models\AccountNotification;
use Pterodactyl\Jobs\DeliverAccountNotification;
use Pterodactyl\Services\Webhooks\WebhookTransport;
use Pterodactyl\Models\AccountNotificationPreference;

class NotificationDeliveryService
{
    public function deliver(int $id, WebhookTransport $transport): void
    {
        Cache::lock('account-notification:' . $id, 45)->get(function () use ($id, $transport) {
            $notification = AccountNotification::with('server')->find($id);
            if (!$notification || $notification->discord_status !== 'pending' || $notification->discord_next_attempt_at?->isFuture()) {
                return;
            }
            $settings = app(NotificationSettings::class)->get();
            $preferences = AccountNotificationPreference::where('user_id', $notification->user_id)->first();
            $user = User::find($notification->user_id);
            if (!$settings['enabled'] || !$settings['discord_enabled'] || !$preferences || !$preferences->discord_webhook
                || $preferences->revision !== $notification->discord_revision || !in_array($notification->event, $preferences->discord_events, true)
                || !$user || !$notification->server || !app(ServerNotificationService::class)->allowed($user, $notification->server, $notification->event)) {
                $notification->update(['discord_status' => 'cancelled']);

                return;
            }
            if ($notification->created_at->lt(now()->subDay()) || $notification->discord_attempts >= 5) {
                $notification->update(['discord_status' => 'failed']);

                return;
            }
            $cooldown = 'account-notification-receiver:' . hash('sha256', $preferences->discord_webhook);
            if (($retryAt = Cache::get($cooldown, 0)) > time()) {
                $notification->update(['discord_next_attempt_at' => now()->addSeconds($retryAt - time())]);

                return;
            }
            $attempt = $notification->discord_attempts + 1;
            $notification->update(['discord_attempts' => $attempt]);
            try {
                $endpoint = new WebhookEndpoint(['format' => 'discord', 'url' => $preferences->discord_webhook]);
                $delivery = new WebhookDelivery(['uuid' => $notification->uuid, 'event_id' => $notification->uuid, 'event_type' => $notification->event,
                    'payload' => ['data' => ['server' => $notification->server_name, 'event' => $notification->event, 'schedule' => $notification->detail, 'occurred_at' => $notification->created_at->toIso8601String()]]]);
                $result = $transport->send($endpoint, $delivery);
                $status = $result['status'];
                if ($status >= 200 && $status < 300) {
                    $notification->update(['discord_status' => 'delivered']);

                    return;
                }
                $delay = $status === 429 ? $result['retry_after'] : 30 * (4 ** ($attempt - 1));
                if ($status === 429) {
                    Cache::put($cooldown, time() + $delay, $delay);
                }
                $retry = $status === 429 || $status >= 500;
            } catch (\Throwable) {
                // URLs and receiver errors can contain webhook tokens. Never record them.
                $retry = true;
                $delay = 30 * (4 ** ($attempt - 1));
            }
            $notification->update(['discord_status' => $retry && $attempt < 5 ? 'pending' : 'failed', 'discord_next_attempt_at' => now()->addSeconds($delay)]);
        });
    }

    public function maintain(): void
    {
        AccountNotification::where('created_at', '<', now()->subDays(30))->delete();
        AccountNotification::where('discord_status', 'pending')->where('discord_next_attempt_at', '<=', now())
            ->eachById(fn ($notification) => DeliverAccountNotification::dispatch($notification->id));
    }
}
