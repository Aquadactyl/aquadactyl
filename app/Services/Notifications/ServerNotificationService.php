<?php

namespace Pterodactyl\Services\Notifications;

use Illuminate\Support\Str;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Subuser;
use Pterodactyl\Models\ActivityLog;
use Pterodactyl\Models\AccountNotification;
use Pterodactyl\Jobs\DeliverAccountNotification;
use Pterodactyl\Models\AccountNotificationPreference;
use Pterodactyl\Services\Servers\GetUserPermissionsService;

class ServerNotificationService
{
    public const EVENTS = [
        'power.start', 'power.stop', 'power.restart', 'server.crash',
        'schedule.complete', 'schedule.fail', 'backup.complete', 'backup.fail', 'install.complete', 'install.fail',
    ];

    public static function event(string $activity): ?string
    {
        return match ($activity) {
            'server:power.start' => 'power.start',
            'server:power.stop', 'server:power.kill' => 'power.stop',
            'server:power.restart' => 'power.restart',
            'server:crash', 'server:crashed' => 'server.crash',
            'server:schedule.complete' => 'schedule.complete',
            'server:schedule.fail' => 'schedule.fail',
            'server:backup.complete' => 'backup.complete',
            'server:backup.fail' => 'backup.fail',
            'server:install.complete' => 'install.complete',
            'server:install.fail' => 'install.fail',
            default => null,
        };
    }

    public function allowed(User $user, Server $server, string $event): bool
    {
        if ($user->suspended_at !== null) {
            return false;
        }
        $permission = str_starts_with($event, 'backup.') ? 'backup.read' : (str_starts_with($event, 'schedule.') ? 'schedule.read' : 'websocket.connect');
        $permissions = app(GetUserPermissionsService::class)->handle($server, $user);

        return in_array('*', $permissions, true) || in_array($permission, $permissions, true);
    }

    public function record(ActivityLog $activity): void
    {
        $event = self::event($activity->event);
        $settings = app(NotificationSettings::class)->get();
        if (!$event || !$settings['enabled']) {
            return;
        }
        $ids = $activity->subjects()->where('subject_type', (new Server())->getMorphClass())->pluck('subject_id');
        foreach (Server::with('subusers')->whereIn('id', $ids)->get() as $server) {
            $recipients = Subuser::where('server_id', $server->id)->pluck('user_id')->push($server->owner_id);
            foreach (AccountNotificationPreference::whereIn('user_id', $recipients)->get() as $preferences) {
                $site = in_array($event, $preferences->site_events, true);
                $discord = $settings['discord_enabled'] && $preferences->discord_webhook !== null && in_array($event, $preferences->discord_events, true);
                if ((!$site && !$discord) || !($user = User::find($preferences->user_id)) || !$this->allowed($user, $server, $event)) {
                    continue;
                }
                $notification = AccountNotification::firstOrCreate(['user_id' => $user->id, 'event_id' => 'activity:' . $activity->id . ':server:' . $server->id], [
                    'uuid' => Str::uuid()->toString(), 'server_id' => $server->id, 'server_name' => $server->name,
                    'event' => $event, 'detail' => str_starts_with($event, 'schedule.') ? mb_substr((string) $activity->properties?->get('name', ''), 0, 255) : null,
                    'site' => $site, 'discord_revision' => $discord ? $preferences->revision : null,
                    'discord_status' => $discord ? 'pending' : 'not_requested', 'discord_next_attempt_at' => $discord ? now() : null,
                ]);
                if ($discord && $notification->wasRecentlyCreated) {
                    DeliverAccountNotification::dispatch($notification->id)->afterCommit();
                }
            }
        }
    }
}
