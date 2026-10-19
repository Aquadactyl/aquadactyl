<?php

namespace Pterodactyl\Observers;

use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Jobs\SyncDiscordRoles;
use Illuminate\Database\Eloquent\Model;
use Pterodactyl\Models\AccountOAuthIdentity;
use Pterodactyl\Services\Discord\DiscordRoleSyncService;
use Pterodactyl\Services\Integrations\IntegrationSettings;

class DiscordRoleObserver
{
    public function created(Model $model): void
    {
        $this->queue($model);
    }

    public function updated(Model $model): void
    {
        if ($model instanceof Server && $model->wasChanged(['owner_id', 'egg_id', 'node_id', 'status', 'account_suspended'])) {
            if ($model->wasChanged('owner_id')) {
                app(DiscordRoleSyncService::class)->queueUser((int) $model->getOriginal('owner_id'));
            }
            $this->queue($model);
        } elseif ($model instanceof User && $model->wasChanged('suspended_at')) {
            $this->queue($model);
        }
    }

    public function deleting(Model $model): void
    {
        // Capture identities before database cascades remove them. Jobs run after commit.
        if ($model instanceof User || $model instanceof AccountOAuthIdentity) {
            $this->queue($model);
        }
    }

    public function deleted(Model $model): void
    {
        if ($model instanceof Server) {
            $this->queue($model);
        }
    }

    private function queue(Model $model): void
    {
        $settings = app(IntegrationSettings::class);
        if (!$settings->discordEnabled()) {
            return;
        }
        if ($model instanceof AccountOAuthIdentity && $model->provider === 'discord') {
            SyncDiscordRoles::dispatch($model->subject)->afterCommit();
        } elseif ($model instanceof Server || $model instanceof User) {
            app(DiscordRoleSyncService::class)->queueUser($model instanceof Server ? $model->owner_id : $model->id);
        }
    }
}
