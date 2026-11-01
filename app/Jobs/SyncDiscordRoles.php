<?php

namespace Pterodactyl\Jobs;

use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Pterodactyl\Services\Discord\DiscordApiClient;
use Pterodactyl\Services\Discord\DiscordRoleSyncService;
use Pterodactyl\Services\Integrations\IntegrationSettings;
use Pterodactyl\Exceptions\Integrations\DiscordApiException;

class SyncDiscordRoles implements ShouldQueue, ShouldBeUnique
{
    use Queueable;

    public int $uniqueFor = 600;
    public int $tries = 5;

    public function __construct(public string $discordId)
    {
        $this->onQueue('low');
    }

    public function uniqueId(): string
    {
        return 'discord-roles:' . $this->discordId;
    }

    public function handle(DiscordRoleSyncService $service, IntegrationSettings $settings, DiscordApiClient $api): void
    {
        try {
            $service->sync($this->discordId, $settings, $api);
        } catch (DiscordApiException $exception) {
            $this->release(max(2, $exception->retryAfter));
        }
    }
}
