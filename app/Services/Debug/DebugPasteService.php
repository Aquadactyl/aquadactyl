<?php

namespace Pterodactyl\Services\Debug;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class DebugPasteService
{
    public function upload(string $content, ?int $expiresIn = null): string
    {
        $endpoint = rtrim((string) config('aquadactyl.debug.endpoint'), '/');
        if ($endpoint === '') {
            throw new RuntimeException('The Aquadactyl debug endpoint is not configured.');
        }

        $payload = ['content' => $this->redact($content)];
        $expiresIn ??= (int) config('aquadactyl.debug.expires_in');
        if ($expiresIn > 0) {
            $payload['expiresIn'] = $expiresIn;
        }

        $response = Http::acceptJson()
            ->connectTimeout(5)
            ->timeout(15)
            ->post($endpoint . '/api/paste', $payload);

        $response->throw();

        $url = $response->json('url');
        if (!is_string($url) || $url === '') {
            throw new RuntimeException('The debug service returned no paste URL.');
        }

        return $url;
    }

    public function readLog(?string $path = null): string
    {
        $path ??= storage_path('logs/laravel.log');
        if (!is_file($path) || !is_readable($path)) {
            throw new RuntimeException("The log file [{$path}] does not exist or is not readable.");
        }

        $maxBytes = max(1, (int) config('aquadactyl.debug.max_bytes', 262144));
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new RuntimeException("Unable to open the log file [{$path}].");
        }

        try {
            $size = fstat($handle)['size'] ?? 0;
            fseek($handle, max(0, $size - $maxBytes));
            $content = stream_get_contents($handle);
        } finally {
            fclose($handle);
        }

        if (!is_string($content)) {
            throw new RuntimeException("Unable to read the log file [{$path}].");
        }

        return $content;
    }

    private function redact(string $content): string
    {
        $patterns = [
            '/((?:password|passwd|secret|token|api[_-]?key|authorization)\s*[=:]\s*)(?:"[^"]*"|\'[^\']*\'|[^\s,;]+)/i',
            '/(Bearer\s+)[A-Za-z0-9._~+\/-]+/i',
        ];

        return preg_replace($patterns, '$1[REDACTED]', $content) ?? $content;
    }
}
