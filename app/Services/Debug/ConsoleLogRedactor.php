<?php

namespace Pterodactyl\Services\Debug;

use Pterodactyl\Models\Server;

class ConsoleLogRedactor
{
    public function __construct(private DebugPasteService $debug)
    {
    }

    public function redact(string $content, Server $server): string
    {
        $content = preg_replace('/\x1b\[[0-?]*[ -\/]*[@-~]|[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/', '', $content);
        if ($content === null) {
            throw new \RuntimeException('Console log redaction failed.');
        }
        // Remove known secrets even when a plugin logs a value without its key.
        $values = [$server->uuid, $server->node->fqdn, $server->node->daemon_token, config('app.key')];
        foreach ($server->variables as $variable) {
            if (!$variable->user_viewable || preg_match('/password|passwd|secret|token|api[_-]?key|private[_-]?key/i', $variable->env_variable)) {
                $values[] = $variable->server_value ?? $variable->default_value;
            }
        }
        foreach ($server->allocations as $allocation) {
            $values[] = $allocation->ip;
            $values[] = $allocation->ip_alias;
        }
        $values = array_unique(array_filter($values, fn ($value) => is_string($value) && $value !== ''));
        usort($values, fn ($a, $b) => strlen($b) <=> strlen($a));
        $content = str_replace($values, '[REDACTED]', $content);
        $content = $this->debug->redact($content);

        $patterns = [
            // Credentials in command flags, URLs and authentication-plugin commands.
            '/((?:--?)(?:[\w-]*[-_])?(?:password|passwd|secret|token|api[-_]?key)\s+)(?:"[^"\r\n]*"|\'[^\'\r\n]*\'|\S+)/i',
            '/(\/(?:login|register|changepassword)\s+)[^\r\n]*/i',
            '/((?:[?&])(?:[\w-]*[_-])?(?:password|secret|token|key)=)[^&\s]*/i',
        ];
        $content = preg_replace($patterns, '$1[REDACTED]', $content);
        if ($content === null) {
            throw new \RuntimeException('Console log redaction failed.');
        }
        $content = preg_replace([
            '/\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b/i',
            '/\b(?:\d{1,3}\.){3}\d{1,3}\b/',
            '/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i',
            '/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/',
            // Also remove standalone key material from a truncated PEM block.
            '/(?<![\w+\/])[A-Za-z0-9+\/]{64,}={0,2}(?![\w+\/])/',
        ], '[REDACTED]', $content);
        if ($content === null) {
            throw new \RuntimeException('Console log redaction failed.');
        }

        $content = preg_replace_callback('/(?<![\w:])(?:[a-f0-9]{0,4}:){2,}[a-f0-9:]{0,39}(?:%[\w.-]+)?/i', function ($match) {
            $address = explode('%', $match[0], 2)[0];

            return filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) ? '[REDACTED]' : $match[0];
        }, $content);
        if ($content === null) {
            throw new \RuntimeException('Console log redaction failed.');
        }

        return $content;
    }
}
