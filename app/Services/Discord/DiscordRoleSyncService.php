<?php

namespace Pterodactyl\Services\Discord;

use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Facades\Activity;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Jobs\SyncDiscordRoles;
use Pterodactyl\Models\DiscordRoleRule;
use Pterodactyl\Models\DiscordRoleSync;
use Pterodactyl\Models\DiscordRoleGrant;
use Pterodactyl\Models\AccountOAuthIdentity;
use Pterodactyl\Services\Integrations\IntegrationSettings;
use Pterodactyl\Exceptions\Integrations\DiscordApiException;

class DiscordRoleSyncService
{
    public function queueUser(int $userId): void
    {
        if (!app(IntegrationSettings::class)->discordEnabled()) {
            return;
        }
        $subjects = AccountOAuthIdentity::where('user_id', $userId)->where('provider', 'discord')->pluck('subject')
            ->merge(DiscordRoleGrant::where('user_id', $userId)->pluck('discord_id'))->unique();
        foreach ($subjects as $subject) {
            SyncDiscordRoles::dispatch((string) $subject)->afterCommit();
        }
    }

    public function queueAll(): void
    {
        if (!app(IntegrationSettings::class)->discordEnabled()) {
            return;
        }
        AccountOAuthIdentity::where('provider', 'discord')->eachById(fn ($identity) => SyncDiscordRoles::dispatch($identity->subject)->afterCommit());
        // Includes unlinked and deleted users, so their previously granted roles can be revoked.
        DiscordRoleGrant::query()->eachById(fn ($grant) => SyncDiscordRoles::dispatch($grant->discord_id)->afterCommit());
        DiscordRoleSync::where('updated_at', '<', now()->subDays(30))->whereNotIn('discord_id', DiscordRoleGrant::select('discord_id'))
            ->whereNotIn('discord_id', AccountOAuthIdentity::where('provider', 'discord')->select('subject'))->delete();
    }

    public function sync(string $discordId, IntegrationSettings $settings, DiscordApiClient $api): void
    {
        if (!$settings->discordEnabled() || preg_match('/^[1-9][0-9]{16,19}$/D', $discordId) !== 1) {
            return;
        }
        $lock = Cache::lock('discord-roles:member:' . $discordId, 120);
        if (!$lock->get()) {
            throw new DiscordApiException('This Discord account is already being synchronized.', 5);
        }
        try {
            $identity = AccountOAuthIdentity::with('user')->where('provider', 'discord')->where('issuer', 'discord')->where('subject', $discordId)->first();
            $user = $identity?->user;
            $desired = $this->desired($user);
            $guild = $settings->get('discord:guild_id');
            $grants = DiscordRoleGrant::where('discord_id', $discordId)->get();
            if ($desired === [] && $grants->isEmpty()) {
                $this->success($discordId);

                return;
            }
            $member = $api->member($guild, $discordId);
            $existing = array_map('strval', $member['roles'] ?? []);
            foreach ($grants as $grant) {
                if ($grant->guild_id === $guild && in_array($grant->role_id, $desired, true) && $member !== null) {
                    continue;
                }
                if ($grant->guild_id !== $guild || in_array($grant->role_id, $existing, true)) {
                    $api->role($grant->guild_id, $discordId, $grant->role_id, false);
                }
                $grant->delete();
                $this->audit('revoked', $user);
            }
            if ($member !== null) {
                foreach ($desired as $role) {
                    if (in_array($role, $existing, true)) {
                        continue;
                    }
                    // Record before the idempotent PUT: even a network timeout may have assigned the role.
                    DiscordRoleGrant::firstOrCreate(['discord_id' => $discordId, 'guild_id' => $guild, 'role_id' => $role], ['user_id' => $user->id]);
                    $api->role($guild, $discordId, $role, true);
                    $this->audit('granted', $user);
                }
            }
            $this->success($discordId);
        } catch (DiscordApiException $exception) {
            DiscordRoleSync::updateOrCreate(['discord_id' => $discordId], ['last_error' => $exception->getMessage()]);
            throw $exception;
        } finally {
            $lock->release();
        }
    }

    public function desired(?User $user): array
    {
        if (!$user || $user->suspended_at) {
            return [];
        }
        $servers = Server::where('owner_id', $user->id)->whereNull('status')->where('account_suspended', false)->get(['egg_id', 'node_id']);

        return DiscordRoleRule::where('enabled', true)
            ->where(fn ($query) => $query->whereNull('egg_id')->orWhereIn('egg_id', Egg::select('id')))
            ->where(fn ($query) => $query->whereNull('node_id')->orWhereIn('node_id', Node::select('id')))
            ->get()->filter(function ($rule) use ($servers) {
                return $servers->filter(fn ($server) => (!$rule->egg_id || $server->egg_id === $rule->egg_id) && (!$rule->node_id || $server->node_id === $rule->node_id))->count() >= $rule->minimum_servers;
            })->pluck('role_id')->map(fn ($role) => (string) $role)->unique()->values()->all();
    }

    private function success(string $id): void
    {
        DiscordRoleSync::updateOrCreate(['discord_id' => $id], ['last_synced_at' => now(), 'last_error' => null]);
    }

    private function audit(string $action, ?User $user): void
    {
        $event = Activity::event('discord:role.' . $action)->anonymous();
        if ($user) {
            $event->subject($user);
        }
        $event->log();
    }
}
