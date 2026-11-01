<?php

namespace Pterodactyl\Services\Discord;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\Client\ConnectionException;
use Pterodactyl\Services\Integrations\IntegrationSettings;
use Pterodactyl\Exceptions\Integrations\DiscordApiException;

class DiscordApiClient
{
    public function __construct(private IntegrationSettings $settings)
    {
    }

    public function member(string $guild, string $member): ?array
    {
        return $this->request('GET', '/guilds/' . $guild . '/members/' . $member);
    }

    public function role(string $guild, string $member, string $role, bool $add): void
    {
        $this->request($add ? 'PUT' : 'DELETE', '/guilds/' . $guild . '/members/' . $member . '/roles/' . $role);
    }

    private function request(string $method, string $path): ?array
    {
        $wait = (int) ceil((float) Cache::get('discord-roles:retry-at', 0) - microtime(true));
        if ($wait > 0) {
            throw new DiscordApiException('Discord rate limit or connection cooldown; synchronization will retry.', $wait);
        }
        $lock = Cache::lock('discord-roles:api', 15);
        if (!$lock->get()) {
            throw new DiscordApiException('Another Discord request is in progress; synchronization will retry.', 2);
        }
        try {
            // Recheck after acquiring the distributed lock to respect other workers' limits.
            $wait = (int) ceil((float) Cache::get('discord-roles:retry-at', 0) - microtime(true));
            if ($wait > 0) {
                throw new DiscordApiException('Discord rate limit or connection cooldown; synchronization will retry.', $wait);
            }
            try {
                $response = Http::withToken($this->settings->discordToken(), 'Bot')->acceptJson()
                    ->withHeaders(['X-Audit-Log-Reason' => 'Aquadactyl%20ownership%20role%20sync'])
                    ->timeout(6)->connectTimeout(3)->withoutRedirecting()->send($method, 'https://discord.com/api/v10' . $path);
            } catch (ConnectionException) {
                throw new DiscordApiException('Discord could not be reached; synchronization will retry.');
            }
            if ($response->status() === 429) {
                $delay = max(1, (float) ($response->json('retry_after') ?? $response->header('Retry-After') ?: 1));
                $this->cooldown($delay);
                throw new DiscordApiException('Discord rate limit reached; synchronization will retry.', (int) ceil($delay));
            }
            if ($response->header('X-RateLimit-Remaining') === '0') {
                $this->cooldown(max(1, (float) $response->header('X-RateLimit-Reset-After')));
            }
            if ($response->status() === 401 || $response->status() === 403) {
                $this->cooldown(600);
                throw new DiscordApiException('Check the bot token, guild membership, Manage Roles permission and role hierarchy.', 600);
            }
            // Unknown member / deleted role are idempotent during cleanup; other 404s are configuration errors.
            if ($response->status() === 404 && in_array($response->json('code'), [10007, 10011], true) && $method !== 'PUT') {
                return null;
            }
            if (!$response->successful()) {
                throw new DiscordApiException('Discord rejected the request. Check the guild and role IDs and bot permissions.', 300);
            }

            $body = $response->status() === 204 ? [] : $response->json();
            if (!is_array($body) || ($method === 'GET' && (!isset($body['roles']) || !is_array($body['roles']) || count(array_filter($body['roles'], 'is_string')) !== count($body['roles'])))) {
                throw new DiscordApiException('Discord returned an invalid member response; synchronization will retry.');
            }

            return $body;
        } finally {
            $lock->release();
        }
    }

    private function cooldown(float $seconds): void
    {
        Cache::put('discord-roles:retry-at', microtime(true) + $seconds, (int) ceil($seconds) + 1);
    }
}
