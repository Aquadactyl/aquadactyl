<?php

namespace Pterodactyl\Services\Webhooks;

use IPLib\Factory;
use IPLib\Range\Type;

class WebhookTarget
{
    public function validate(string $url, string $format): array
    {
        $parts = parse_url($url);
        if (strlen($url) > 2048 || preg_match('/[\x00-\x20\x7f]/', $url) || !$parts || ($parts['scheme'] ?? '') !== 'https'
            || empty($parts['host']) || isset($parts['user']) || isset($parts['pass']) || isset($parts['fragment']) || ($parts['port'] ?? 443) !== 443) {
            throw new \InvalidArgumentException('Use an HTTPS webhook URL on port 443 without user information or fragments.');
        }
        $host = strtolower($parts['host']);
        if (!filter_var($host, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME) || !str_contains($host, '.') || str_ends_with($host, '.')) {
            throw new \InvalidArgumentException('Use a public DNS hostname for the webhook.');
        }
        if ($format === 'discord') {
            if (!in_array($host, ['discord.com', 'ptb.discord.com', 'canary.discord.com', 'discordapp.com'], true)
                || !preg_match('~^/api/(?:v[0-9]+/)?webhooks/[0-9]+/[A-Za-z0-9_.-]+$~D', $parts['path'] ?? '')) {
                throw new \InvalidArgumentException('Use a Discord incoming webhook URL.');
            }
            parse_str($parts['query'] ?? '', $query);
            if (array_diff(array_keys($query), ['wait', 'thread_id']) || (isset($query['thread_id']) && (!is_string($query['thread_id']) || !ctype_digit($query['thread_id'])))) {
                throw new \InvalidArgumentException('Only a Discord thread ID and wait parameter are supported.');
            }
            $parts['query'] = http_build_query(['wait' => 'true'] + (isset($query['thread_id']) ? ['thread_id' => $query['thread_id']] : []));
            $url = 'https://' . $host . $parts['path'] . '?' . $parts['query'];
        }

        return ['url' => $url, 'host' => $host];
    }

    public function resolve(string $url, string $format): array
    {
        $target = $this->validate($url, $format);
        $addresses = $this->addresses($target['host']);
        if (!$addresses) {
            throw new \RuntimeException('The webhook hostname could not be resolved.');
        }
        foreach ($addresses as $ip) {
            if (Factory::parseAddressString($ip)?->getRangeType() !== Type::T_PUBLIC) {
                throw new \RuntimeException('Webhook destinations must resolve exclusively to public IP addresses.');
            }
        }

        return $target + ['ip' => $addresses[0]];
    }

    protected function addresses(string $host): array
    {
        $records = @dns_get_record($host, DNS_A | DNS_AAAA);

        return array_values(array_filter(array_map(fn ($record) => $record['ip'] ?? $record['ipv6'] ?? null, $records ?: [])));
    }
}
