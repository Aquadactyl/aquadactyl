<?php

namespace Pterodactyl\Services\Debug;

use Illuminate\Support\Facades\Http;

class DebugPasteService
{
    public function upload(string $content, ?int $expiresIn = null): string
    {
        $endpoint = rtrim((string) config('aquadactyl.debug.endpoint'), '/');
        if ($endpoint === '') {
            throw new \RuntimeException('The Aquadactyl debug endpoint is not configured.');
        }

        $expiresIn ??= (int) config('aquadactyl.debug.expires_in');
        // Match the public debug service's duration values. Sending a raw
        // integer to that API can accidentally create a non-expiring paste.
        $durations = [0 => '', 3600 => '1h', 86400 => '24h', 172800 => '2d', 604800 => '7d', 2592000 => '30d'];
        if (!array_key_exists($expiresIn, $durations)) {
            throw new \RuntimeException('Debug expiration must be 0, 3600, 86400, 172800, 604800, or 2592000 seconds.');
        }
        $payload = ['content' => $this->redact($content), 'expiresIn' => $durations[$expiresIn]];

        $response = Http::acceptJson()
            ->connectTimeout(5)
            ->timeout(15)
            ->withoutRedirecting()
            ->post($endpoint . '/paste', $payload);

        $response->throw();
        if ($response->json('success') === false) {
            throw new \RuntimeException('The debug service rejected the log upload.');
        }

        $url = $response->json('url');
        $id = $response->json('id');
        if ($url === null && is_string($id) && preg_match('/^[A-Za-z0-9_-]{1,128}$/D', $id)) {
            $url = $endpoint . '/paste/' . $id;
        }
        if (!is_string($url) || !filter_var($url, FILTER_VALIDATE_URL)
            || !in_array(parse_url($url, PHP_URL_SCHEME), ['http', 'https'], true)
            || parse_url($url, PHP_URL_SCHEME) !== parse_url($endpoint, PHP_URL_SCHEME)
            || parse_url($url, PHP_URL_HOST) !== parse_url($endpoint, PHP_URL_HOST)
            || parse_url($url, PHP_URL_PORT) !== parse_url($endpoint, PHP_URL_PORT)
            || parse_url($url, PHP_URL_USER) !== null || parse_url($url, PHP_URL_PASS) !== null) {
            throw new \RuntimeException('The debug service returned no valid paste URL.');
        }

        return $url;
    }

    public function readLog(?string $path = null): string
    {
        $path ??= $this->defaultLogPath();
        if (!is_file($path) || !is_readable($path)) {
            throw new \RuntimeException("The log file [{$path}] does not exist or is not readable.");
        }

        $maxBytes = max(1, (int) config('aquadactyl.debug.max_bytes', 262144));
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new \RuntimeException("Unable to open the log file [{$path}].");
        }

        try {
            $size = fstat($handle)['size'] ?? 0;
            fseek($handle, max(0, $size - $maxBytes));
            $content = stream_get_contents($handle);
        } finally {
            fclose($handle);
        }

        if (!is_string($content)) {
            throw new \RuntimeException("Unable to read the log file [{$path}].");
        }

        // A byte-limited tail may start in the middle of a UTF-8 character.
        return mb_convert_encoding($content, 'UTF-8', 'UTF-8');
    }

    private function defaultLogPath(): string
    {
        $channel = config('logging.channels.' . config('logging.default'), []);
        if (($channel['driver'] ?? null) === 'stack') {
            foreach ($channel['channels'] ?? [] as $name) {
                $candidate = config("logging.channels.$name", []);
                if (in_array($candidate['driver'] ?? null, ['daily', 'single'], true)) {
                    $channel = $candidate;
                    break;
                }
            }
        }
        if (!in_array($channel['driver'] ?? null, ['daily', 'single'], true)) {
            throw new \RuntimeException('The configured log channel does not write a panel log file. Pass --file=/path/to/log to choose one.');
        }
        $path = $channel['path'] ?? storage_path('logs/laravel.log');
        if (($channel['driver'] ?? null) === 'daily') {
            $info = pathinfo($path);
            $prefix = $info['dirname'] . '/' . $info['filename'] . '-';
            $suffix = isset($info['extension']) ? '.' . $info['extension'] : '';
            $files = array_filter(glob($prefix . '*' . $suffix) ?: [], fn (string $file) => preg_match('/^\d{4}-\d{2}-\d{2}$/D', substr($file, strlen($prefix), strlen($file) - strlen($prefix) - strlen($suffix)))
                && is_file($file) && is_readable($file)
            );
            rsort($files);
            if ($files !== []) {
                return $files[0];
            }
        }

        return $path;
    }

    public function redact(string $content): string
    {
        $patterns = [
            '/(Bearer\s+)[A-Za-z0-9._~+\/-]+/i',
            '/(Basic\s+)[A-Za-z0-9+\/=]+/i',
            '/(^\s*(?:Cookie|Set-Cookie|Authorization)\s*:\s*)[^\r\n]*/im',
            '/((?:["\']?)(?:[a-z][\w.-]*[_-])?(?:password|passwd|secret|token|api[_-]?key|app[_-]?key|private[_-]?key|hashids[_-]?salt|authorization|cookie|set-cookie)["\']?\s*(?:=>|[=:])\s*)(?:"[^"\\\\]*(?:\\\\.[^"\\\\]*)*"|\'[^\'\\\\]*(?:\\\\.[^\'\\\\]*)*\'|[^\s,;}\]]+)/i',
        ];

        $content = $this->replace($patterns, '$1[REDACTED]', $content);
        $content = $this->replace('/(\b[a-z][a-z0-9+.-]*:\/\/)[^\/\s:@]+:[^@\s\/]+@/i', '$1[REDACTED]@', $content);

        return $this->replace('/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/', '[REDACTED PRIVATE KEY]', $content);
    }

    private function replace(string|array $pattern, string $replacement, string $content): string
    {
        $redacted = preg_replace($pattern, $replacement, $content);
        if ($redacted === null) {
            throw new \RuntimeException('Debug log redaction failed. No content was uploaded.');
        }

        return $redacted;
    }
}
