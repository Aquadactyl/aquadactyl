<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Subuser;
use Pterodactyl\Facades\Activity;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Pterodactyl\Events\ActivityLogged;
use Pterodactyl\Models\AccountNotification;
use Pterodactyl\Jobs\RecordServerNotifications;
use Pterodactyl\Jobs\DeliverAccountNotification;
use Pterodactyl\Services\Webhooks\WebhookTransport;
use Pterodactyl\Models\AccountNotificationPreference;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Integrations\IntegrationSettings;
use Pterodactyl\Services\Notifications\NotificationSettings;
use Pterodactyl\Listeners\Notifications\QueueServerNotification;
use Pterodactyl\Services\Notifications\ServerNotificationService;
use Pterodactyl\Services\Notifications\NotificationDeliveryService;

uses(DatabaseTransactions::class);

beforeEach(function () {
    app()->instance(Illuminate\Contracts\Debug\ExceptionHandler::class, new class(app()) extends Pterodactyl\Exceptions\Handler {
        public function render($request, Throwable $e): Symfony\Component\HttpFoundation\Response
        {
            return (new ReflectionMethod(Illuminate\Foundation\Exceptions\Handler::class, 'render'))->invoke($this, $request, $e);
        }
    });
    config()->set('pterodactyl.auth.2fa_required', 0);
    Queue::fake();
    Cache::flush();
    $this->server = $this->createServerModel();
    $this->user = $this->server->user;
    $this->settings = app(IntegrationSettings::class);
    $this->settings->set('notifications:enabled', '1');
    $this->settings->set('notifications:discord_enabled', '1');
    $this->webhook = 'https://discord.com/api/webhooks/123456789012345678/private-token';
    $this->preferences = fn ($user, array $data = []) => AccountNotificationPreference::create(array_replace([
        'user_id' => $user->id, 'site_events' => ServerNotificationService::EVENTS,
        'discord_events' => [], 'discord_webhook' => null, 'revision' => 1,
    ], $data));
    $this->activity = fn ($event = 'server:power.start') => Activity::event($event)->subject($this->server)->property('name', 'Daily restart')->log();
    $this->pending = function (array $data = []) {
        ($this->preferences)($this->user, ['discord_events' => ['power.start'], 'discord_webhook' => $this->webhook]);
        app(ServerNotificationService::class)->record(($this->activity)());
        $notification = AccountNotification::firstOrFail();
        $notification->update($data);

        return $notification;
    };
});

test('notification preferences are opt in encrypted password protected and never disclose webhook URLs', function () {
    $this->getJson('/api/client/account/notifications/preferences')->assertUnauthorized();
    $this->actingAs($this->user)->getJson('/api/client/account/notifications/preferences')->assertOk()->assertJsonPath('site_events', [])->assertJsonPath('has_webhook', false);
    $payload = ['site_events' => ['power.start'], 'discord_events' => ['power.start'], 'discord_webhook' => $this->webhook];
    $this->putJson('/api/client/account/notifications/preferences', $payload)->assertUnprocessable();
    $this->putJson('/api/client/account/notifications/preferences', $payload + ['current_password' => 'password'])->assertOk()->assertJsonPath('has_webhook', true)->assertDontSee('private-token');
    $preferences = AccountNotificationPreference::firstOrFail();
    expect($preferences->getRawOriginal('discord_webhook'))->not->toContain('private-token')
        ->and($preferences->toArray())->not->toHaveKey('discord_webhook');
    $this->putJson('/api/client/account/notifications/preferences', ['site_events' => []])->assertOk()->assertJsonPath('site_events', [])->assertJsonPath('has_webhook', true);
    $this->putJson('/api/client/account/notifications/preferences', ['site_events' => [], 'clear_webhook' => true, 'current_password' => 'password'])->assertOk()->assertJsonPath('has_webhook', false)->assertJsonPath('discord_events', []);
    expect($preferences->fresh()->revision)->toBe(3);
});

test('personal webhook destinations and notification event inputs are strictly validated', function ($data) {
    $this->actingAs($this->user)->putJson('/api/client/account/notifications/preferences', array_replace(['site_events' => [], 'current_password' => 'password'], $data))->assertUnprocessable();
    expect(AccountNotificationPreference::count())->toBe(0);
})->with([
    [['site_events' => ['unknown']]],
    [['site_events' => ['power.start', 'power.start']]],
    [['discord_events' => ['power.start']]],
    [['discord_webhook' => 'http://discord.com/api/webhooks/1/token']],
    [['discord_webhook' => 'https://discord.com.attacker.test/api/webhooks/1/token']],
    [['discord_webhook' => 'https://127.0.0.1/api/webhooks/1/token']],
    [['discord_webhook' => 'https://discord.com/api/webhooks/1/token#fragment']],
]);

test('administrators can disable all notifications or only personal Discord delivery', function () {
    $this->settings->set('notifications:discord_enabled', '0');
    $this->actingAs($this->user)->getJson('/api/client/account/notifications/preferences')->assertOk()->assertJsonPath('discord_enabled', false);
    $this->putJson('/api/client/account/notifications/preferences', ['site_events' => ['schedule.complete']])->assertOk();
    $this->putJson('/api/client/account/notifications/preferences', ['site_events' => [], 'discord_events' => ['power.start']])->assertUnprocessable();
    $this->settings->set('notifications:enabled', '0');
    $this->getJson('/api/client/account/notifications/preferences')->assertForbidden();
    $this->putJson('/api/client/account/notifications/preferences', ['site_events' => []])->assertForbidden();
    $this->getJson('/api/client/account/notifications')->assertForbidden();
    $this->postJson('/api/client/account/notifications/read', ['ids' => []])->assertForbidden();
    app(ServerNotificationService::class)->record(($this->activity)());
    expect(AccountNotification::count())->toBe(0);
});

test('notification fanout respects event choices server permissions suspension and deduplication', function () {
    ($this->preferences)($this->user);
    $viewer = User::factory()->create();
    $outsider = User::factory()->create();
    $suspended = User::factory()->create(['suspended_at' => now()]);
    foreach ([$viewer, $outsider, $suspended] as $user) {
        ($this->preferences)($user);
    }
    $subuser = Subuser::create(['server_id' => $this->server->id, 'user_id' => $viewer->id, 'permissions' => ['websocket.connect']]);
    Subuser::create(['server_id' => $this->server->id, 'user_id' => $suspended->id, 'permissions' => ['*']]);
    $activity = ($this->activity)();
    $job = new RecordServerNotifications($activity->id);
    $job->handle(app(ServerNotificationService::class));
    $job->handle(app(ServerNotificationService::class));
    expect(AccountNotification::count())->toBe(2);
    app(ServerNotificationService::class)->record(($this->activity)('server:backup.complete'));
    app(ServerNotificationService::class)->record(($this->activity)('server:schedule.complete'));
    app(ServerNotificationService::class)->record(($this->activity)('server:command'));
    expect(AccountNotification::where('user_id', $viewer->id)->count())->toBe(1)
        ->and(AccountNotification::where('user_id', $this->user->id)->count())->toBe(3);
    $this->actingAs($viewer)->getJson('/api/client/account/notifications')->assertOk()->assertJsonCount(1, 'data');
    $subuser->delete();
    $this->getJson('/api/client/account/notifications')->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('unread_count', 0);
    $missing = new RecordServerNotifications(PHP_INT_MAX);
    $missing->handle(app(ServerNotificationService::class));
});

test('inbox cursors unread counts and read operations are scoped to the authenticated account', function () {
    ($this->preferences)($this->user);
    for ($i = 0; $i < 28; ++$i) {
        app(ServerNotificationService::class)->record(($this->activity)());
    }
    $latest = AccountNotification::latest('id')->firstOrFail();
    $first = AccountNotification::oldest('id')->firstOrFail();
    $this->actingAs($this->user)->getJson('/api/client/account/notifications')->assertOk()->assertJsonCount(25, 'data')->assertJsonPath('unread_count', 28)->assertJsonPath('cursor', $latest->id);
    $this->getJson('/api/client/account/notifications?after_id=' . $latest->id)->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('cursor', $latest->id);
    $this->getJson('/api/client/account/notifications?after_id=' . ($latest->id - 1))->assertOk()->assertJsonCount(1, 'data');
    $this->getJson('/api/client/account/notifications?before_id=' . ($first->id + 3))->assertOk()->assertJsonCount(3, 'data');
    $other = User::factory()->create();
    $this->actingAs($other)->postJson('/api/client/account/notifications/read', ['ids' => [$latest->uuid]])->assertNoContent();
    expect($latest->fresh()->read_at)->toBeNull();
    $this->actingAs($this->user)->postJson('/api/client/account/notifications/read', ['ids' => [$latest->uuid]])->assertNoContent();
    $this->getJson('/api/client/account/notifications')->assertOk()->assertJsonPath('unread_count', 27);
    expect($latest->fresh()->server->id)->toBe($this->server->id);
});

test('Discord delivery contains only selected event data and uses the existing secure transport', function () {
    $notification = ($this->pending)();
    Queue::assertPushed(DeliverAccountNotification::class);
    $transport = Mockery::mock(WebhookTransport::class);
    $transport->expects('send')->withArgs(function ($endpoint, $delivery) {
        expect($endpoint->format)->toBe('discord')->and($endpoint->url)->toBe($this->webhook);
        expect(array_keys($delivery->payload['data']))->toBe(['server', 'event', 'schedule', 'occurred_at']);

        return true;
    })->andReturn(['status' => 204, 'retry_after' => 60]);
    $job = new DeliverAccountNotification($notification->id);
    expect($job->uniqueId())->toBe('account-notification:' . $notification->id);
    $job->handle(app(NotificationDeliveryService::class), $transport);
    expect($notification->fresh()->discord_status)->toBe('delivered');
    $job->handle(app(NotificationDeliveryService::class), $transport);
    app(NotificationDeliveryService::class)->deliver(PHP_INT_MAX, $transport);
});

test('pending deliveries are cancelled when consent permissions or administrator policy changes', function ($change) {
    $notification = ($this->pending)();
    $preference = AccountNotificationPreference::firstOrFail();
    match ($change) {
        'disabled' => $this->settings->set('notifications:enabled', '0'),
        'discord_disabled' => $this->settings->set('notifications:discord_enabled', '0'),
        'removed' => $preference->delete(),
        'webhook' => $preference->update(['discord_webhook' => null]),
        'revision' => $preference->update(['revision' => 2]),
        'events' => $preference->update(['discord_events' => []]),
        'suspended' => $this->user->forceFill(['suspended_at' => now()])->save(),
        'ownership' => $this->server->update(['owner_id' => User::factory()->create()->id]),
    };
    $transport = Mockery::mock(WebhookTransport::class);
    $transport->shouldNotReceive('send');
    app(NotificationDeliveryService::class)->deliver($notification->id, $transport);
    expect($notification->fresh()->discord_status)->toBe('cancelled');
})->with(['disabled', 'discord_disabled', 'removed', 'webhook', 'revision', 'events', 'suspended', 'ownership']);

test('Discord failures retry with backoff without exposing webhook credentials', function ($status, $expected) {
    $notification = ($this->pending)();
    $transport = Mockery::mock(WebhookTransport::class);
    if ($status === 0) {
        $transport->expects('send')->andThrow(new RuntimeException('private-token'));
    } else {
        $transport->expects('send')->andReturn(['status' => $status, 'retry_after' => 120]);
    }
    $service = app(NotificationDeliveryService::class);
    $service->deliver($notification->id, $transport);
    expect($notification->fresh()->discord_status)->toBe($expected)->and($notification->fresh()->discord_attempts)->toBe(1);
    $service->deliver($notification->id, $transport);
    if ($status === 429) {
        $notification->update(['discord_next_attempt_at' => now()->subSecond()]);
        $service->deliver($notification->id, $transport);
        expect($notification->fresh()->discord_attempts)->toBe(1);
    }
})->with([[429, 'pending'], [503, 'pending'], [400, 'failed'], [0, 'pending']]);

test('notification maintenance retries due deliveries expires old records and stops exhausted attempts', function () {
    $notification = ($this->pending)();
    $this->artisan('p:notifications:maintain')->assertExitCode(0);
    Queue::assertPushed(DeliverAccountNotification::class);
    $notification->update(['discord_attempts' => 5]);
    $transport = Mockery::mock(WebhookTransport::class);
    $transport->shouldNotReceive('send');
    app(NotificationDeliveryService::class)->deliver($notification->id, $transport);
    expect($notification->fresh()->discord_status)->toBe('failed');
    $notification->update(['created_at' => now()->subDays(31)]);
    app(NotificationDeliveryService::class)->maintain();
    expect(AccountNotification::count())->toBe(0);
});

test('notification event mapping covers all supported events and rejects unrelated activity', function () {
    foreach (['start', 'stop', 'restart', 'kill'] as $action) {
        expect(ServerNotificationService::event('server:power.' . $action))->toBe('power.' . ($action === 'kill' ? 'stop' : $action));
    }
    foreach (['server:crash', 'server:crashed'] as $action) {
        expect(ServerNotificationService::event($action))->toBe('server.crash');
    }
    foreach (['schedule', 'backup', 'install'] as $type) {
        foreach (['complete', 'fail'] as $result) {
            expect(ServerNotificationService::event("server:$type.$result"))->toBe("$type.$result");
        }
    }
    expect(ServerNotificationService::event('user:account.password-changed'))->toBeNull();
});

test('admin notification policy requires an administrator session and current password', function () {
    $this->actingAs($this->user)->get('/admin/settings/notifications')->assertForbidden();
    $admin = User::factory()->create(['root_admin' => true]);
    $this->actingAs($admin)->get('/admin/settings/notifications')->assertOk()->assertSee('Notifications');
    $this->postJson('/admin/settings/notifications', ['enabled' => 0, 'discord_enabled' => 0, 'current_password' => 'wrong'])->assertUnprocessable();
    $this->post('/admin/settings/notifications', ['enabled' => 0, 'discord_enabled' => 0, 'current_password' => 'password'])->assertRedirect('/admin/settings/notifications');
    expect(app(NotificationSettings::class)->get())->toBe(['enabled' => false, 'discord_enabled' => false]);
});

test('an administrator receives only their own inbox entries', function () {
    $this->user->forceFill(['root_admin' => true])->save();
    ($this->preferences)($this->user);
    app(ServerNotificationService::class)->record(($this->activity)());
    $this->actingAs($this->user)->getJson('/api/client/account/notifications')->assertOk()->assertJsonCount(1, 'data');
    $otherAdmin = User::factory()->create(['root_admin' => true]);
    $this->actingAs($otherAdmin)->getJson('/api/client/account/notifications')->assertOk()->assertJsonCount(0, 'data');
});

test('notification queue failures never interrupt a server action or expose credentials', function () {
    $activity = ($this->activity)();
    $database = DB::getFacadeRoot();
    DB::shouldReceive('afterCommit')->once()->andReturnUsing(fn ($callback) => $callback());
    Bus::shouldReceive('dispatch')->once()->andThrow(new RuntimeException('private webhook token'));
    Log::spy();
    try {
        app(QueueServerNotification::class)->handle(new ActivityLogged($activity));
        Log::shouldHaveReceived('warning')->once()->with('An account notification could not be queued. Check the queue configuration.');
    } finally {
        DB::swap($database);
    }
});
