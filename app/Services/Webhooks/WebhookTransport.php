<?php

namespace Pterodactyl\Services\Webhooks;

use GuzzleHttp\Psr7\Utils;
use GuzzleHttp\Psr7\FnStream;
use GuzzleHttp\Handler\CurlHandler;
use Illuminate\Support\Facades\Http;
use Pterodactyl\Models\WebhookDelivery;
use Pterodactyl\Models\WebhookEndpoint;

class WebhookTransport
{
    public function __construct(private WebhookTarget $target)
    {
    }

    public function send(WebhookEndpoint $endpoint, WebhookDelivery $delivery): array
    {
        $target = $this->target->resolve($endpoint->url, $endpoint->format);
        if (!$this->curlAvailable()) {
            throw new \RuntimeException('The PHP cURL extension is required for webhook delivery.');
        }
        $payload = $delivery->payload;
        if ($endpoint->format === 'discord') {
            $text = str_replace('`', "'", json_encode($payload['data'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
            $payload = ['allowed_mentions' => ['parse' => []], 'embeds' => [[
                'title' => 'Aquadactyl: ' . $delivery->event_type,
                'description' => "```json\n" . mb_substr($text, 0, 3000) . "\n```",
                'footer' => ['text' => 'Event ' . $delivery->event_id],
            ]]];
        }
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $timestamp = (string) time();
        $headers = ['X-Aquadactyl-Delivery' => $delivery->uuid, 'X-Aquadactyl-Event' => $delivery->event_type, 'X-Aquadactyl-Timestamp' => $timestamp];
        if ($endpoint->format === 'json') {
            $headers['X-Aquadactyl-Signature'] = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, $endpoint->signing_secret);
        }
        $bytes = 0;
        $sink = FnStream::decorate(Utils::streamFor(''), ['write' => function (string $chunk) use (&$bytes): int {
            $bytes += strlen($chunk);
            if ($bytes > 65536) {
                throw new \RuntimeException('Webhook response exceeded the size limit.');
            }

            // Discard response content; it may contain credentials or unbounded receiver output.
            return strlen($chunk);
        }]);
        $ip = str_contains($target['ip'], ':') ? '[' . $target['ip'] . ']' : $target['ip'];
        try {
            $response = Http::withHeaders($headers)->withUserAgent('Aquadactyl-Webhook/1')->withBody($body, 'application/json')
                ->connectTimeout(3)->timeout(8)->withoutRedirecting()->setHandler(new CurlHandler())->withOptions([
                    'proxy' => '', 'verify' => true, 'cookies' => false,
                    'curl' => [CURLOPT_RESOLVE => [$target['host'] . ':443:' . $ip], CURLOPT_FRESH_CONNECT => true, CURLOPT_FORBID_REUSE => true],
                    'sink' => $sink,
                    'on_headers' => function ($response) {
                        if ((int) $response->getHeaderLine('Content-Length') > 65536) {
                            throw new \RuntimeException('Webhook response exceeded the size limit.');
                        }
                    },
                ])->send('POST', $target['url']);
            $retry = $response->header('Retry-After');

            return ['status' => $response->status(), 'retry_after' => is_numeric($retry) ? max(1, min(86400, (int) ceil((float) $retry))) : 60];
        } catch (\Throwable) {
            throw new \RuntimeException('The webhook receiver could not be reached securely or returned an oversized response.');
        } finally {
            $sink->close();
        }
    }

    protected function curlAvailable(): bool
    {
        return extension_loaded('curl');
    }
}
