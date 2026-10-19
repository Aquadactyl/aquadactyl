<?php

namespace Pterodactyl\Services\Webhooks;

use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\WebhookDelivery;

class WebhookDeliveryService
{
    public function deliver(int $id, WebhookTransport $transport): void
    {
        Cache::lock('webhook-delivery:' . $id, 45)->get(function () use ($id, $transport) {
            $delivery = WebhookDelivery::with('endpoint')->find($id);
            if (!$delivery || $delivery->status !== 'pending' || $delivery->next_attempt_at?->isFuture()) {
                return;
            }
            $endpoint = $delivery->endpoint;
            if (!$endpoint || !$endpoint->enabled || $endpoint->revision !== $delivery->endpoint_revision) {
                $delivery->update(['status' => 'cancelled', 'last_error' => 'The webhook was disabled or its configuration changed.']);

                return;
            }
            if ($delivery->created_at->lt(now()->subDay()) || $delivery->attempts >= 5) {
                $delivery->update(['status' => 'failed', 'last_error' => 'Delivery expired or exhausted its retry limit.']);

                return;
            }
            try {
                $cooldown = 'webhook-receiver:' . hash('sha256', parse_url($endpoint->url, PHP_URL_HOST) ?: '');
                $retryAt = Cache::get($cooldown, 0);
                if ($retryAt > time()) {
                    $delivery->update(['next_attempt_at' => now()->addSeconds($retryAt - time())]);

                    return;
                }
                $attempt = $delivery->attempts + 1;
                $delivery->update(['status' => 'sending', 'attempts' => $attempt]);
                $result = $transport->send($endpoint, $delivery);
                $code = $result['status'];
                if ($code >= 200 && $code < 300) {
                    $delivery->update(['status' => 'succeeded', 'last_status' => $code, 'last_error' => null, 'delivered_at' => now()]);

                    return;
                }
                $retry = $code === 429 || $code >= 500;
                $delay = $code === 429 ? $result['retry_after'] : $this->backoff($delivery->attempts);
                if ($code === 429) {
                    Cache::put($cooldown, time() + $delay, $delay);
                }
                $delivery->update(['status' => $retry && $attempt < 5 ? 'pending' : 'failed', 'last_status' => $code,
                    'last_error' => 'Receiver returned HTTP ' . $code . '.', 'next_attempt_at' => now()->addSeconds($delay)]);
            } catch (\Throwable) {
                $delivery->refresh();
                $delivery->update(['status' => $delivery->attempts < 5 ? 'pending' : 'failed', 'last_error' => 'Secure delivery failed. Check the public HTTPS destination, DNS and receiver availability.', 'next_attempt_at' => now()->addSeconds($this->backoff($delivery->attempts))]);
            }
        });
    }

    public function retryPending(WebhookEmitter $emitter): void
    {
        WebhookDelivery::where('created_at', '<', now()->subDays(30))->whereNotIn('status', ['pending', 'sending'])->delete();
        WebhookDelivery::where('status', 'sending')->where('updated_at', '<', now()->subMinutes(5))->update(['status' => 'pending', 'next_attempt_at' => now()]);
        WebhookDelivery::where('status', 'pending')->where('next_attempt_at', '<=', now())->eachById(fn ($delivery) => $emitter->queue($delivery->id));
    }

    private function backoff(int $attempt): int
    {
        return [30, 120, 600, 1800, 3600][max(0, min(4, $attempt - 1))];
    }
}
