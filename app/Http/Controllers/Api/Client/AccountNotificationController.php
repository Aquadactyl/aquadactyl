<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Pterodactyl\Models\AccountNotification;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Services\Webhooks\WebhookTarget;
use Pterodactyl\Models\AccountNotificationPreference;
use Pterodactyl\Services\Accounts\ConfirmAccountPassword;
use Pterodactyl\Services\Notifications\NotificationSettings;
use Pterodactyl\Services\Notifications\ServerNotificationService;

class AccountNotificationController extends ClientApiController
{
    public function preferences(Request $request, NotificationSettings $settings): JsonResponse
    {
        $configuration = $settings->get();
        abort_unless($configuration['enabled'], 403);
        $preferences = AccountNotificationPreference::where('user_id', $request->user()->id)->first();

        return response()->json($configuration + [
            'events' => collect(ServerNotificationService::EVENTS)->map(fn ($event) => ['id' => $event, 'label' => __('notifications.events.' . $event)])->all(),
            'site_events' => $preferences->site_events ?? [], 'discord_events' => $configuration['discord_enabled'] ? ($preferences->discord_events ?? []) : [],
            'has_webhook' => $configuration['discord_enabled'] && $preferences?->discord_webhook !== null,
        ]);
    }

    public function update(Request $request, NotificationSettings $settings, WebhookTarget $target, ConfirmAccountPassword $confirmation): JsonResponse
    {
        $configuration = $settings->get();
        abort_unless($configuration['enabled'], 403);
        $data = $request->validate([
            'site_events' => 'present|array|max:10', 'site_events.*' => ['required', 'string', 'distinct', Rule::in(ServerNotificationService::EVENTS)],
            'discord_events' => 'sometimes|array|max:10', 'discord_events.*' => ['required', 'string', 'distinct', Rule::in(ServerNotificationService::EVENTS)],
            'discord_webhook' => 'nullable|string|max:2048', 'clear_webhook' => 'sometimes|boolean',
        ]);
        $replace = !empty($data['discord_webhook']);
        $clear = !empty($data['clear_webhook']);
        if (!$configuration['discord_enabled'] && ($replace || !empty($data['discord_events']))) {
            throw ValidationException::withMessages(['discord_webhook' => __('notifications.discord_disabled')]);
        }
        $url = null;
        if ($replace || $clear) {
            $confirmation->handle($request);
        }
        if ($replace) {
            try {
                $url = $target->validate($data['discord_webhook'], 'discord')['url'];
            } catch (\InvalidArgumentException) {
                throw ValidationException::withMessages(['discord_webhook' => __('notifications.invalid_webhook')]);
            }
        }
        DB::transaction(function () use ($request, $data, $replace, $clear, $url) {
            $preferences = AccountNotificationPreference::firstOrCreate(['user_id' => $request->user()->id], ['site_events' => [], 'discord_events' => []]);
            $preferences = AccountNotificationPreference::whereKey($preferences->id)->lockForUpdate()->firstOrFail();
            $preferences->site_events = $data['site_events'];
            if (array_key_exists('discord_events', $data)) {
                $preferences->discord_events = $data['discord_events'];
            }
            if ($replace || $clear) {
                $preferences->discord_webhook = $clear ? null : $url;
                ++$preferences->revision;
            }
            if ($clear) {
                $preferences->discord_events = [];
            }
            if ($preferences->discord_events && !$preferences->discord_webhook) {
                throw ValidationException::withMessages(['discord_webhook' => __('notifications.webhook_required')]);
            }
            $preferences->save();
        });

        return $this->preferences($request, $settings);
    }

    public function index(Request $request, NotificationSettings $settings): JsonResponse
    {
        abort_unless($settings->get()['enabled'], 403);
        $data = $request->validate(['after_id' => 'sometimes|integer|min:0', 'before_id' => 'sometimes|integer|min:1']);
        $query = $this->inbox($request);
        $after = isset($data['after_id']) ? (int) $data['after_id'] : null;
        $rows = (clone $query)->when($after !== null, fn ($q) => $q->where('id', '>', $after))
            ->when(isset($data['before_id']), fn ($q) => $q->where('id', '<', $data['before_id']))
            ->orderBy('id', $after !== null ? 'asc' : 'desc')->limit(25)->with('server')->get();

        return response()->json([
            'data' => $rows->map(fn ($row) => [
                'id' => $row->id, 'uuid' => $row->uuid, 'event' => $row->event, 'server_name' => $row->server_name,
                'server_identifier' => $row->server->identifier, 'detail' => $row->detail,
                'created_at' => $row->created_at->toIso8601String(), 'read_at' => $row->read_at?->toIso8601String(),
            ]),
            'unread_count' => (clone $query)->whereNull('read_at')->count(),
            'cursor' => $after !== null ? ($rows->max('id') ?? $after) : ($rows->max('id') ?? 0),
            'before_id' => $rows->count() === 25 ? $rows->min('id') : null,
        ]);
    }

    public function read(Request $request, NotificationSettings $settings): JsonResponse
    {
        abort_unless($settings->get()['enabled'], 403);
        $data = $request->validate(['ids' => 'required|array|max:100', 'ids.*' => 'required|uuid']);
        $this->inbox($request)->whereIn('uuid', $data['ids'])->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json([], 204);
    }

    private function inbox(Request $request)
    {
        $user = $request->user();

        return AccountNotification::where('user_id', $user->id)->where('site', true)->whereHas('server', function ($server) use ($user) {
            if ($user->root_admin) {
                return;
            }
            $server->where('owner_id', $user->id)->orWhereHas('subusers', function ($subuser) use ($user) {
                $subuser->where('user_id', $user->id)->where(function ($permissions) {
                    $permissions->whereJsonContains('permissions', '*');
                    foreach (['backup' => 'backup.read', 'schedule' => 'schedule.read', 'power' => 'websocket.connect', 'server' => 'websocket.connect', 'install' => 'websocket.connect'] as $prefix => $permission) {
                        $permissions->orWhere(fn ($q) => $q->where('account_notifications.event', 'like', $prefix . '.%')->whereJsonContains('permissions', $permission));
                    }
                });
            });
        });
    }
}
