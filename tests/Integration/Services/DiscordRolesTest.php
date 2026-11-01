<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Queue;
use Pterodactyl\Jobs\SyncDiscordRoles;
use Pterodactyl\Models\DiscordRoleRule;
use Pterodactyl\Models\DiscordRoleSync;
use Pterodactyl\Models\DiscordRoleGrant;
use Pterodactyl\Models\AccountOAuthIdentity;
use Pterodactyl\Observers\DiscordRoleObserver;
use Pterodactyl\Services\Discord\DiscordApiClient;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Discord\DiscordRoleSyncService;
use Pterodactyl\Services\Integrations\IntegrationSettings;
use Pterodactyl\Exceptions\Integrations\DiscordApiException;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set('pterodactyl.auth.2fa_required', 0);
    Queue::fake();
    Cache::forget('discord-roles:retry-at');
    $this->settings = app(IntegrationSettings::class);
    $this->settings->set('discord:enabled', '0');
    $this->guild = '123456789012345678';
    $this->subject = '223456789012345678';
    $this->role = '323456789012345678';
    $this->settings->set('discord:guild_id', $this->guild);
    $this->settings->set('discord:bot_token', Crypt::encryptString('test-bot-secret'));
    $this->admin = User::factory()->create(['root_admin' => true]);
    $this->user = User::factory()->create(['root_admin' => false]);
    $this->identity = AccountOAuthIdentity::create(['user_id' => $this->user->id, 'provider' => 'discord', 'issuer' => 'discord', 'subject' => $this->subject, 'identity_hash' => AccountOAuthIdentity::identityHash('discord', 'discord', $this->subject), 'display_name' => 'Discord user']);
    $this->service = app(DiscordRoleSyncService::class);
    $this->api = app(DiscordApiClient::class);
    $this->rule = fn (array $attributes = []) => DiscordRoleRule::create(array_merge(['name' => 'Hosting customer', 'role_id' => $this->role, 'enabled' => true, 'minimum_servers' => 1], $attributes));
    $this->grant = fn (array $attributes = []) => DiscordRoleGrant::create(array_merge(['user_id' => $this->user->id, 'discord_id' => $this->subject, 'guild_id' => $this->guild, 'role_id' => $this->role], $attributes));
    $this->sync = fn () => $this->service->sync($this->subject, $this->settings, $this->api);
    Http::preventStrayRequests();
});

test('Discord configuration is administrator only and tokens require fresh passwords remain encrypted and are never flashed', function () {
    $payload = ['enabled' => 1, 'guild_id' => $this->guild, 'bot_token' => 'private-new-bot-token', 'current_password' => 'password'];
    $this->actingAs($this->user)->get('/admin/settings/discord')->assertForbidden();
    $this->patch('/admin/settings/discord', $payload)->assertForbidden();
    $this->actingAs($this->admin)->patchJson('/admin/settings/discord', array_merge($payload, ['current_password' => 'wrong']))->assertUnprocessable();
    $this->patch('/admin/settings/discord', $payload)->assertRedirect('/admin/settings/discord');
    $stored = $this->settings->get('discord:bot_token');
    expect($stored)->not->toBe($payload['bot_token'])->and(Crypt::decryptString($stored))->toBe($payload['bot_token']);
    $this->get('/admin/settings/discord')->assertOk()->assertDontSee($payload['bot_token'])->assertSee('Bot connection');
    $this->get('/')->assertDontSee($payload['bot_token']);
    $this->patch('/admin/settings/discord', array_merge($payload, ['bot_token' => '']))->assertRedirect();
    expect($this->settings->get('discord:bot_token'))->toBe($stored);
    $this->withHeader('Accept', 'text/html')->from('/admin/settings/discord')->patch('/admin/settings/discord', array_merge($payload, ['guild_id' => 'invalid']))
        ->assertSessionHasErrors()->assertSessionMissing('_old_input.bot_token')->assertSessionMissing('_old_input.current_password');
    Http::assertNothingSent();
});

test('Discord cannot be enabled without credentials and corrupt secrets fail closed', function () {
    $this->settings->set('discord:bot_token', 'corrupt');
    expect($this->settings->discordToken())->toBe('')->and($this->settings->discordEnabled())->toBeFalse();
    $this->actingAs($this->admin)->patchJson('/admin/settings/discord', ['current_password' => 'password', 'enabled' => 1, 'guild_id' => $this->guild])->assertUnprocessable();
    $this->patch('/admin/settings/discord', ['current_password' => 'password', 'enabled' => 0, 'guild_id' => '', 'clear_token' => 1])->assertRedirect();
    expect($this->settings->discordToken())->toBe('');
});

test('a guild cannot change while managed role grants still require cleanup', function () {
    ($this->grant)();
    $this->actingAs($this->admin)->patchJson('/admin/settings/discord', ['current_password' => 'password', 'enabled' => 0, 'guild_id' => '423456789012345678'])->assertUnprocessable();
});

test('administrators can create update disable and remove validated role rules and queue a reconciliation', function () {
    $server = $this->createServerModel(['owner_id' => $this->user->id, 'status' => null]);
    $this->settings->set('discord:enabled', '1');
    $payload = ['name' => 'Minecraft owner', 'role_id' => $this->role, 'minimum_servers' => 1, 'enabled' => 1, 'egg_id' => $server->egg_id, 'node_id' => $server->node_id];
    $this->actingAs($this->admin)->post('/admin/settings/discord/rules', $payload)->assertRedirect();
    $rule = DiscordRoleRule::latest('id')->firstOrFail();
    expect($this->service->desired($this->user))->toBe([$this->role]);
    $this->patch('/admin/settings/discord/rules/' . $rule->id, array_merge($payload, ['enabled' => 0]))->assertRedirect();
    expect($this->service->desired($this->user))->toBeEmpty();
    $this->get('/admin/settings/discord')->assertOk()->assertSee('Minecraft owner');
    $this->delete('/admin/settings/discord/rules/' . $rule->id)->assertRedirect();
    $this->post('/admin/settings/discord/sync')->assertRedirect();
    Queue::assertPushed(SyncDiscordRoles::class, fn ($job) => $job->discordId === $this->subject && $job->queue === 'low');
    $this->postJson('/admin/settings/discord/rules', array_merge($payload, ['role_id' => 'bad/path']))->assertUnprocessable();
    $this->postJson('/admin/settings/discord/rules', array_merge($payload, ['minimum_servers' => 0]))->assertUnprocessable();
    $this->actingAs($this->user)->post('/admin/settings/discord/rules', $payload)->assertForbidden();
});

test('rules match both egg and node count only eligible owned servers and combine duplicate roles with OR', function () {
    $server = $this->createServerModel(['owner_id' => $this->user->id, 'status' => null]);
    ($this->rule)(['egg_id' => $server->egg_id, 'node_id' => $server->node_id, 'minimum_servers' => 2]);
    expect($this->service->desired($this->user))->toBeEmpty();
    ($this->rule)(['egg_id' => $server->egg_id, 'node_id' => $server->node_id]);
    ($this->rule)(['egg_id' => 99999999]);
    ($this->rule)(['node_id' => 99999999]);
    expect($this->service->desired($this->user))->toBe([$this->role]);
    $server->forceFill(['account_suspended' => true])->save();
    expect($this->service->desired($this->user))->toBeEmpty();
    $server->forceFill(['account_suspended' => false, 'status' => Server::STATUS_SUSPENDED])->save();
    expect($this->service->desired($this->user))->toBeEmpty();
    $server->update(['status' => Server::STATUS_INSTALLING]);
    expect($this->service->desired($this->user))->toBeEmpty();
    $this->user->forceFill(['suspended_at' => now()])->save();
    expect($this->service->desired($this->user))->toBeEmpty()->and($this->service->desired(null))->toBeEmpty();
});

test('matching owners receive roles and repeated reconciliation does not regrant existing roles', function () {
    $this->settings->set('discord:enabled', '1');
    $this->createServerModel(['owner_id' => $this->user->id, 'status' => null]);
    ($this->rule)();
    Http::fakeSequence()->push(['roles' => []])->push('', 204)->push(['roles' => [$this->role]]);
    ($this->sync)();
    expect(DiscordRoleGrant::where('discord_id', $this->subject)->count())->toBe(1);
    ($this->sync)();
    Http::assertSentCount(3);
    Http::assertSent(fn ($request) => $request->method() === 'PUT' && $request->hasHeader('Authorization', 'Bot test-bot-secret'));
    expect(DiscordRoleSync::where('discord_id', $this->subject)->firstOrFail()->last_error)->toBeNull();
});

test('roles present before Aquadactyl grants them remain unmanaged and are never removed', function () {
    $this->settings->set('discord:enabled', '1');
    $server = $this->createServerModel(['owner_id' => $this->user->id, 'status' => null]);
    ($this->rule)();
    Http::fakeSequence()->push(['roles' => [$this->role]]);
    ($this->sync)();
    expect(DiscordRoleGrant::where('discord_id', $this->subject)->count())->toBe(0);
    $server->update(['status' => Server::STATUS_SUSPENDED]);
    ($this->sync)();
    Http::assertSentCount(1);
});

test('managed roles are revoked after unlinking suspension deleting rules and transfer of ownership', function (string $change) {
    $this->settings->set('discord:enabled', '1');
    $server = $this->createServerModel(['owner_id' => $this->user->id, 'status' => null]);
    $rule = ($this->rule)();
    ($this->grant)();
    match ($change) {
        'unlink' => $this->identity->delete(),
        'suspend' => $this->user->forceFill(['suspended_at' => now()])->save(),
        'delete-rule' => $rule->delete(),
        'disable-rule' => $rule->update(['enabled' => false]),
        'transfer' => $server->update(['owner_id' => $this->admin->id]),
        'egg-change' => $rule->update(['egg_id' => 9999999]),
        'deleted-user' => $this->identity->delete(),
    };
    Http::fakeSequence()->push(['roles' => [$this->role]])->push('', 204);
    ($this->sync)();
    expect(DiscordRoleGrant::where('discord_id', $this->subject)->count())->toBe(0);
    Http::assertSent(fn ($request) => $request->method() === 'DELETE');
})->with(['unlink', 'suspend', 'delete-rule', 'disable-rule', 'transfer', 'egg-change']);

test('missing members or manually removed roles clear obsolete grants without unnecessary role requests', function (bool $missing) {
    $this->settings->set('discord:enabled', '1');
    ($this->grant)();
    Http::fakeSequence()->push($missing ? ['code' => 10007] : ['roles' => []], $missing ? 404 : 200);
    ($this->sync)();
    expect(DiscordRoleGrant::where('discord_id', $this->subject)->count())->toBe(0);
    Http::assertSentCount(1);
})->with([true, false]);

test('grants for an old guild are cleaned up using their original guild ID', function () {
    $this->settings->set('discord:enabled', '1');
    ($this->grant)(['guild_id' => '423456789012345678']);
    Http::fakeSequence()->push(['roles' => []])->push(['code' => 10011], 404);
    ($this->sync)();
    Http::assertSent(fn ($request) => $request->method() === 'DELETE' && str_contains($request->url(), '/guilds/423456789012345678/'));
    expect(DiscordRoleGrant::where('discord_id', $this->subject)->count())->toBe(0);
});

test('disabled synchronization and invalid Discord subjects never contact Discord', function () {
    ($this->grant)();
    ($this->sync)();
    $this->service->queueAll();
    $this->service->queueUser($this->user->id);
    $this->settings->set('discord:enabled', '1');
    $this->service->sync('../invalid', $this->settings, $this->api);
    Http::assertNothingSent();
});

test('scheduler queues linked and orphaned grants and model changes queue both previous and new owners', function () {
    $this->settings->set('discord:enabled', '1');
    $server = $this->createServerModel(['owner_id' => $this->user->id, 'status' => null]);
    ($this->grant)();
    $server->update(['owner_id' => $this->admin->id]);
    $this->identity->delete();
    $this->artisan('p:discord:sync-roles')->assertSuccessful();
    Queue::assertPushed(SyncDiscordRoles::class, fn ($job) => $job->discordId === $this->subject);
    $this->user->forceFill(['suspended_at' => now()])->save();
    $server->delete();
    // Exercise deleted-account capture while identities still exist, before database cascades.
    $this->user->delete();
    expect(DiscordRoleGrant::first()->user_id)->toBeNull();
    $observer = app(DiscordRoleObserver::class);
    $observer->created($this->admin);
    $observer->updated($this->identity);
    $observer->deleting($server);
    $observer->deleted($this->admin);
});

test('rate limiting honours retry headers and never leaks response bodies or bot tokens', function () {
    $this->settings->set('discord:enabled', '1');
    ($this->grant)();
    Http::fakeSequence()->push(['retry_after' => 7.5, 'message' => 'test-bot-secret'], 429);
    try {
        ($this->sync)();
        test()->fail('Expected a rate limit.');
    } catch (DiscordApiException $exception) {
        expect($exception->retryAfter)->toBe(8)->and($exception->getMessage())->not->toContain('test-bot-secret');
    }
    expect(fn () => ($this->sync)())->toThrow(DiscordApiException::class);
    Http::assertSentCount(1);
    expect(DiscordRoleSync::where('discord_id', $this->subject)->value('last_error'))->not->toContain('test-bot-secret');
});

test('ownership transfer queues both linked owners without reacting to unrelated server name edits', function () {
    $server = $this->createServerModel(['owner_id' => $this->user->id, 'status' => null]);
    $otherId = '523456789012345678';
    AccountOAuthIdentity::create(['user_id' => $this->admin->id, 'provider' => 'discord', 'issuer' => 'discord', 'subject' => $otherId, 'identity_hash' => AccountOAuthIdentity::identityHash('discord', 'discord', $otherId), 'display_name' => 'Other owner']);
    $this->settings->set('discord:enabled', '1');
    Queue::fake();
    $server->update(['name' => 'Renamed server']);
    Queue::assertNotPushed(SyncDiscordRoles::class);
    $server->update(['owner_id' => $this->admin->id]);
    Queue::assertPushed(SyncDiscordRoles::class, fn ($job) => $job->discordId === $this->subject);
    Queue::assertPushed(SyncDiscordRoles::class, fn ($job) => $job->discordId === $otherId);
});

test('Discord failures preserve grants for retry and report only sanitized messages', function (int $status, array|string $body) {
    $this->settings->set('discord:enabled', '1');
    ($this->grant)();
    Http::fakeSequence()->push($body, $status);
    expect(fn () => ($this->sync)())->toThrow(DiscordApiException::class);
    expect(DiscordRoleGrant::where('discord_id', $this->subject)->count())->toBe(1);
    expect(DiscordRoleSync::where('discord_id', $this->subject)->value('last_error'))->not->toContain('test-bot-secret');
    $this->actingAs($this->admin)->get('/admin/settings/discord')->assertOk()->assertDontSee('test-bot-secret');
})->with([[401, ['message' => 'test-bot-secret']], [403, ['message' => 'test-bot-secret']], [500, ['message' => 'test-bot-secret']], [404, ['code' => 10004]], [200, 'not json'], [200, ['roles' => [123]]]]);

test('connection errors and concurrent API requests safely retry without sharing credentials', function () {
    Http::fake(fn () => throw new Illuminate\Http\Client\ConnectionException('test-bot-secret'));
    expect(fn () => $this->api->member($this->guild, $this->subject))->toThrow(DiscordApiException::class);
    $lock = Cache::lock('discord-roles:api', 15);
    $lock->get();
    try {
        expect(fn () => $this->api->member($this->guild, $this->subject))->toThrow(DiscordApiException::class);
    } finally {
        $lock->release();
    }
});

test('successful Discord responses with exhausted buckets pause subsequent API requests', function () {
    Http::fakeSequence()->push(['roles' => []], 200, ['X-RateLimit-Remaining' => '0', 'X-RateLimit-Reset-After' => '3']);
    expect($this->api->member($this->guild, $this->subject))->toBe(['roles' => []]);
    expect(fn () => $this->api->member($this->guild, $this->subject))->toThrow(DiscordApiException::class);
    Http::assertSentCount(1);
});

test('a cooldown published by another worker while acquiring the API lock is respected', function () {
    $lock = Cache::lock('discord-roles:api', 15);
    Cache::shouldReceive('get')->with('discord-roles:retry-at', 0)->twice()->andReturn(0, microtime(true) + 10);
    Cache::shouldReceive('lock')->with('discord-roles:api', 15)->once()->andReturn($lock);
    expect(fn () => $this->api->member($this->guild, $this->subject))->toThrow(DiscordApiException::class);
    Http::assertNothingSent();
});

test('jobs have unique keys run on the low queue and release themselves when Discord asks to retry', function () {
    $job = new SyncDiscordRoles($this->subject);
    expect($job->uniqueId())->toBe('discord-roles:' . $this->subject)->and($job->queue)->toBe('low');
    $job->handle($this->service, $this->settings, $this->api);
    $this->settings->set('discord:enabled', '1');
    ($this->grant)();
    Http::fakeSequence()->push(['retry_after' => 10], 429);
    $queueJob = Mockery::mock(Illuminate\Contracts\Queue\Job::class);
    $queueJob->shouldReceive('release')->once()->with(10);
    $job->setJob($queueJob);
    $job->handle($this->service, $this->settings, $this->api);
});

test('a role sync lock prevents competing updates to the same member', function () {
    $this->settings->set('discord:enabled', '1');
    $lock = Cache::lock('discord-roles:member:' . $this->subject, 120);
    $lock->get();
    try {
        expect(fn () => ($this->sync)())->toThrow(DiscordApiException::class);
    } finally {
        $lock->release();
    }
});

test('rule count limits prevent unbounded synchronization configuration', function () {
    for ($i = 0; $i < 100; ++$i) {
        ($this->rule)();
    }
    $this->actingAs($this->admin)->postJson('/admin/settings/discord/rules', ['name' => 'Too many', 'role_id' => $this->role, 'enabled' => 1, 'minimum_servers' => 1])->assertUnprocessable();
});
