<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\View\View;
use Pterodactyl\Models\Egg;
use Illuminate\Http\Request;
use Pterodactyl\Models\Node;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Pterodactyl\Models\DiscordRoleRule;
use Pterodactyl\Models\DiscordRoleSync;
use Pterodactyl\Models\DiscordRoleGrant;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Models\AccountOAuthIdentity;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Services\Discord\DiscordRoleSyncService;
use Pterodactyl\Services\Accounts\ConfirmAccountPassword;
use Pterodactyl\Services\Accounts\AccountSecuritySettings;
use Pterodactyl\Services\Integrations\IntegrationSettings;

class DiscordRolesController extends Controller
{
    public function index(IntegrationSettings $settings, AccountSecuritySettings $security): View
    {
        return view('admin.settings.discord', [
            'enabled' => $settings->get('discord:enabled') === '1', 'guildId' => $settings->get('discord:guild_id'),
            'hasToken' => $settings->discordToken() !== '', 'oauthEnabled' => $security->provider('discord')['enabled'],
            'rules' => DiscordRoleRule::orderBy('id')->get(), 'eggs' => Egg::orderBy('name')->get(['id', 'name']),
            'nodes' => Node::orderBy('name')->get(['id', 'name']), 'grants' => DiscordRoleGrant::count(),
            'linked' => AccountOAuthIdentity::where('provider', 'discord')->count(),
            'syncErrors' => DiscordRoleSync::whereNotNull('last_error')->latest('updated_at')->limit(20)->get(),
            'lastSyncedAt' => DiscordRoleSync::max('last_synced_at'),
        ]);
    }

    public function update(Request $request, IntegrationSettings $settings, ConfirmAccountPassword $confirmation, DiscordRoleSyncService $sync): RedirectResponse
    {
        $confirmation->handle($request);
        $data = $request->validate([
            'enabled' => 'required|boolean', 'guild_id' => ['nullable', 'regex:/^[1-9][0-9]{16,19}$/D'],
            'bot_token' => ['nullable', 'string', 'max:255', 'regex:/^[A-Za-z0-9_.-]+$/D'], 'clear_token' => 'sometimes|boolean',
        ]);
        if (($data['guild_id'] ?? '') !== $settings->get('discord:guild_id') && DiscordRoleGrant::exists()) {
            throw ValidationException::withMessages(['guild_id' => __('integrations.discord.guild_locked')]);
        }
        if ($data['enabled'] && (empty($data['guild_id']) || (empty($data['bot_token']) && (!empty($data['clear_token']) || $settings->discordToken() === '')))) {
            throw ValidationException::withMessages(['enabled' => __('integrations.discord.credentials_required')]);
        }
        DB::transaction(function () use ($data, $settings) {
            $settings->set('discord:enabled', $data['enabled'] ? '1' : '0');
            $settings->set('discord:guild_id', $data['guild_id'] ?? '');
            if (!empty($data['bot_token'])) {
                $settings->set('discord:bot_token', Crypt::encryptString($data['bot_token']));
            } elseif (!empty($data['clear_token'])) {
                $settings->set('discord:bot_token', '');
            }
        });
        Cache::forget('discord-roles:retry-at');
        $sync->queueAll();

        return $this->saved();
    }

    public function rule(Request $request, DiscordRoleSyncService $sync, ?DiscordRoleRule $rule = null): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100', 'role_id' => ['required', 'regex:/^[1-9][0-9]{16,19}$/D'],
            'egg_id' => 'nullable|integer|exists:eggs,id', 'node_id' => 'nullable|integer|exists:nodes,id',
            'minimum_servers' => 'required|integer|min:1|max:10000', 'enabled' => 'required|boolean',
        ]);
        if (!$rule && DiscordRoleRule::count() >= 100) {
            throw ValidationException::withMessages(['name' => __('integrations.discord.rule_limit')]);
        }
        ($rule ?? new DiscordRoleRule())->fill($data)->save();
        $sync->queueAll();

        return $this->saved();
    }

    public function remove(DiscordRoleRule $rule, DiscordRoleSyncService $sync): RedirectResponse
    {
        $rule->delete();
        $sync->queueAll();

        return $this->saved();
    }

    public function sync(DiscordRoleSyncService $sync): RedirectResponse
    {
        $sync->queueAll();

        return $this->saved();
    }

    private function saved(): RedirectResponse
    {
        app(\Prologue\Alerts\AlertsMessageBag::class)->success(__('integrations.discord.saved'))->flash();

        return new RedirectResponse(route('admin.settings.discord', [], false));
    }
}
