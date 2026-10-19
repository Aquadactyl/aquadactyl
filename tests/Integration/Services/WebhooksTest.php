<?php

use Illuminate\Support\Str;
use Pterodactyl\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Models\ActivityLog;
use Illuminate\Support\Facades\Http;
use Pterodactyl\Jobs\DeliverWebhook;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Pterodactyl\Events\ActivityLogged;
use Pterodactyl\Models\StatusIncident;
use Pterodactyl\Models\StatusComponent;
use Pterodactyl\Models\WebhookDelivery;
use Pterodactyl\Models\WebhookEndpoint;
use Pterodactyl\Services\Webhooks\WebhookTarget;
use Pterodactyl\Services\Webhooks\WebhookEmitter;
use Pterodactyl\Services\Status\StatusPageService;
use Pterodactyl\Services\Webhooks\WebhookTransport;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Webhooks\WebhookDeliveryService;
use Pterodactyl\Listeners\Webhooks\SendSystemActionWebhook;

uses(DatabaseTransactions::class);

beforeEach(function () {
    // The production handler rolls back every transaction on validation errors.
    // Keep the test harness transaction while retaining Laravel's real error rendering.
    app()->instance(Illuminate\Contracts\Debug\ExceptionHandler::class, new class(app()) extends Pterodactyl\Exceptions\Handler {
        public function render($request, Throwable $e): Symfony\Component\HttpFoundation\Response
        {
            return (new ReflectionMethod(Illuminate\Foundation\Exceptions\Handler::class, 'render'))->invoke($this, $request, $e);
        }
    });
    config()->set('pterodactyl.auth.2fa_required', 0);
    Cache::flush();
    Queue::fake();
    Http::preventStrayRequests();
    $this->emitter = app(WebhookEmitter::class);
    $this->endpoint = fn (array $data = []) => WebhookEndpoint::create(array_replace(['name' => 'Test receiver', 'format' => 'json', 'url' => 'https://hooks.example.com/events', 'signing_secret' => str_repeat('s', 40), 'events' => WebhookEndpoint::GROUPS, 'enabled' => true, 'revision' => 1], $data));
    $this->delivery = function ($endpoint, array $data = []) {
        $this->emitter->test($endpoint);
        $delivery = WebhookDelivery::latest('id')->firstOrFail();
        $delivery->update($data);

        return $delivery;
    };
});

test('webhook administration enforces permission passwords encryption redaction and configuration revisions', function () {
    $admin = User::factory()->create(['root_admin' => true]);
    $user = User::factory()->create(['root_admin' => false]);
    $payload = ['name' => 'Operations', 'format' => 'json', 'enabled' => 1, 'events' => ['system'], 'webhook_url' => 'https://hooks.example.com/private-token', 'webhook_secret' => str_repeat('private-secret', 3), 'current_password' => 'password'];
    $this->actingAs($user)->get('/admin/settings/webhooks')->assertForbidden();
    $this->post('/admin/settings/webhooks', $payload)->assertForbidden();
    $this->actingAs($admin)->postJson('/admin/settings/webhooks', array_replace($payload, ['current_password' => 'wrong']))->assertUnprocessable();
    $this->post('/admin/settings/webhooks', $payload)->assertRedirect('/admin/settings/webhooks');
    $endpoint = WebhookEndpoint::firstOrFail();
    expect($endpoint->url)->toBe($payload['webhook_url'])->and($endpoint->getRawOriginal('url'))->not->toContain('private-token')->and($endpoint->toArray())->not->toHaveKeys(['url', 'signing_secret']);
    $this->get('/admin/settings/webhooks')->assertOk()->assertSee('Operations')->assertDontSee('private-token')->assertDontSee($payload['webhook_secret']);
    $action = '/admin/settings/webhooks/' . $endpoint->id . '/action';
    $this->post($action, array_replace($payload, ['operation' => 'save', 'name' => 'Renamed', 'webhook_url' => '', 'webhook_secret' => '']))->assertRedirect();
    expect($endpoint->fresh()->revision)->toBe(1)->and($endpoint->fresh()->signing_secret)->toBe($payload['webhook_secret']);
    $this->post($action, array_replace($payload, ['operation' => 'save', 'enabled' => 0]))->assertRedirect();
    expect($endpoint->fresh()->revision)->toBe(2);
    $this->postJson($action, ['operation' => 'test', 'current_password' => 'password'])->assertUnprocessable();
    $this->post($action, array_replace($payload, ['operation' => 'save']))->assertRedirect();
    $this->post($action, ['operation' => 'test', 'current_password' => 'password'])->assertRedirect();
    expect(WebhookDelivery::count())->toBe(1);
    $this->get('/admin/settings/webhooks')->assertOk()->assertSee('webhook.test');
    $this->withHeader('Accept', 'text/html')->from('/admin/settings/webhooks')->post('/admin/settings/webhooks', array_replace($payload, ['name' => '']))->assertSessionHasErrors()->assertSessionMissing('_old_input.webhook_url')->assertSessionMissing('_old_input.webhook_secret')->assertSessionMissing('_old_input.current_password');
    $this->post($action, ['operation' => 'delete', 'current_password' => 'password'])->assertRedirect();
    expect(WebhookEndpoint::count())->toBe(0)->and(WebhookDelivery::count())->toBe(0);
    Http::assertNothingSent();
});

test('invalid destinations unsigned JSON invalid subscriptions and excess endpoints are rejected', function () {
    $this->actingAs(User::factory()->create(['root_admin' => true]));
    $payload = ['name' => 'Test', 'format' => 'json', 'enabled' => 1, 'events' => ['system'], 'webhook_url' => 'https://hooks.example.com/events', 'current_password' => 'password'];
    $this->postJson('/admin/settings/webhooks', $payload)->assertUnprocessable()->assertJsonPath('errors.0.meta.source_field', 'webhook_secret');
    $this->postJson('/admin/settings/webhooks', array_replace($payload, ['webhook_url' => 'http://example.com']))->assertUnprocessable()->assertJsonPath('errors.0.meta.source_field', 'webhook_url');
    $this->postJson('/admin/settings/webhooks', array_replace($payload, ['events' => ['arbitrary']]))->assertUnprocessable();
    $discord = array_replace($payload, ['format' => 'discord', 'webhook_url' => 'https://discord.com/api/webhooks/123/test-token']);
    $this->post('/admin/settings/webhooks', $discord)->assertRedirect();
    expect(WebhookEndpoint::first()->signing_secret)->toBeNull()->and(WebhookEndpoint::first()->url)->toEndWith('?wait=true');
    for ($i = 0; $i < 19; ++$i) {
        ($this->endpoint)();
    }
    $this->postJson('/admin/settings/webhooks', $discord)->assertUnprocessable()->assertJsonPath('errors.0.meta.source_field', 'name');
});

test('events are filtered deduplicated and queued only after commit and rollbacks discard notifications', function () {
    $endpoint = ($this->endpoint)();
    $eventId = (string) Str::uuid();
    foreach (['system.action', 'status.health.changed', 'status.incident.published', 'updates.available', 'updates.installed'] as $event) {
        $this->emitter->emit($event, ['safe' => 'value'], $eventId);
    }
    // A caller must use a distinct event ID for each occurrence; redelivery is idempotent.
    expect(WebhookDelivery::count())->toBe(1);
    $this->emitter->emit('unrecognized.event', []);
    expect($this->emitter->subscribed('invalid'))->toBeFalse();
    DB::beginTransaction();
    $this->emitter->test($endpoint);
    DB::rollBack();
    expect(WebhookDelivery::count())->toBe(1);
    Queue::assertPushed(DeliverWebhook::class, 1);
    $delivery = WebhookDelivery::first();
    $job = new DeliverWebhook($delivery->id);
    expect($job->uniqueId())->toBe('webhook:' . $delivery->id)->and($job->queue)->toBe('low');
    $service = Mockery::mock(WebhookDeliveryService::class);
    $transport = Mockery::mock(WebhookTransport::class);
    $service->shouldReceive('deliver')->once()->with($delivery->id, $transport);
    $job->handle($service, $transport);
});

test('notification and queue failures stay sanitized and do not break the underlying action', function () {
    ($this->endpoint)();
    $cache = Cache::getFacadeRoot();
    Cache::shouldReceive('remember')->once()->andThrow(new RuntimeException('private credential'));
    Log::spy();
    $this->emitter->emit('system.action', []);
    Log::shouldHaveReceived('warning')->once()->with('A webhook event could not be queued. Check the webhook database and queue configuration.');
    Cache::swap($cache);
    Bus::shouldReceive('dispatch')->once()->andThrow(new RuntimeException('private URL'));
    $this->emitter->queue(123);
    Log::shouldHaveReceived('warning')->with('A webhook delivery is waiting for queue recovery.')->once();
});

test('delivery classifies responses with bounded retries and shared receiver cooldown', function (int $status, string $expected, int $attempts) {
    $endpoint = ($this->endpoint)();
    $delivery = ($this->delivery)($endpoint, ['attempts' => $attempts]);
    $transport = Mockery::mock(WebhookTransport::class);
    $transport->shouldReceive('send')->once()->andReturn(['status' => $status, 'retry_after' => 120]);
    app(WebhookDeliveryService::class)->deliver($delivery->id, $transport);
    expect($delivery->fresh()->status)->toBe($expected)->and($delivery->fresh()->attempts)->toBe($attempts + 1)->and($delivery->fresh()->last_status)->toBe($status);
    if ($status === 429) {
        $other = ($this->delivery)($endpoint);
        app(WebhookDeliveryService::class)->deliver($other->id, $transport);
        expect($other->fresh()->attempts)->toBe(0)->and($other->fresh()->next_attempt_at->isFuture())->toBeTrue();
    }
})->with([[204, 'succeeded', 0], [302, 'failed', 0], [400, 'failed', 0], [429, 'pending', 0], [500, 'pending', 0], [503, 'failed', 4]]);

test('stale disabled exhausted duplicate locked and failed transports are handled safely', function () {
    $endpoint = ($this->endpoint)();
    $service = app(WebhookDeliveryService::class);
    $transport = Mockery::mock(WebhookTransport::class);
    $service->deliver(99999999, $transport);
    foreach ([['status' => 'succeeded'], ['next_attempt_at' => now()->addHour()]] as $data) {
        $delivery = ($this->delivery)($endpoint, $data);
        $service->deliver($delivery->id, $transport);
        expect($delivery->fresh()->attempts)->toBe(0);
    }
    foreach ([['attempts' => 5], ['created_at' => now()->subDays(2)]] as $data) {
        $delivery = ($this->delivery)($endpoint, $data);
        $service->deliver($delivery->id, $transport);
        expect($delivery->fresh()->status)->toBe('failed');
    }
    foreach ([['enabled' => false], ['revision' => 4]] as $data) {
        $delivery = ($this->delivery)($endpoint);
        $endpoint->update($data);
        $service->deliver($delivery->id, $transport);
        expect($delivery->fresh()->status)->toBe('cancelled');
        $endpoint->update(['enabled' => true]);
    }
    $delivery = ($this->delivery)($endpoint);
    $lock = Cache::lock('webhook-delivery:' . $delivery->id, 45);
    $lock->get();
    $service->deliver($delivery->id, $transport);
    expect($delivery->fresh()->attempts)->toBe(0);
    $lock->release();
    $transport->shouldReceive('send')->twice()->andThrow(new RuntimeException('https://secret.example.com/token'));
    $service->deliver($delivery->id, $transport);
    expect($delivery->fresh()->status)->toBe('pending')->and($delivery->fresh()->last_error)->not->toContain('secret.example');
    $delivery->refresh()->update(['attempts' => 4, 'next_attempt_at' => now()]);
    $service->deliver($delivery->id, $transport);
    expect($delivery->fresh()->status)->toBe('failed');
});

test('scheduler recovers interrupted sends prunes old history and manual retries retain delivery identity', function () {
    $endpoint = ($this->endpoint)();
    $old = ($this->delivery)($endpoint, ['status' => 'failed', 'created_at' => now()->subDays(31)]);
    $interrupted = ($this->delivery)($endpoint, ['status' => 'sending', 'updated_at' => now()->subMinutes(6)]);
    $this->artisan('p:webhooks:retry')->assertSuccessful();
    expect($old->fresh())->toBeNull()->and($interrupted->fresh()->status)->toBe('pending');
    $failed = ($this->delivery)($endpoint, ['status' => 'failed', 'attempts' => 5, 'created_at' => now()->subDays(2)]);
    $admin = User::factory()->create(['root_admin' => true]);
    $this->actingAs($admin)->get('/admin/settings/webhooks')->assertOk()->assertSee('Retry a failed delivery');
    $this->post('/admin/settings/webhooks/deliveries/retry', ['current_password' => 'password', 'delivery_id' => $failed->id])->assertRedirect();
    expect($failed->fresh()->status)->toBe('pending')->and($failed->fresh()->uuid)->toBe($failed->uuid)->and($failed->fresh()->created_at->isToday())->toBeTrue();
    $this->postJson('/admin/settings/webhooks/deliveries/retry', ['current_password' => 'password', 'delivery_id' => $failed->id])->assertUnprocessable();
});

test('JSON and Discord transports pin DNS enforce HTTPS suppress mentions and sign the exact body', function (string $format, string $ip) {
    $endpoint = ($this->endpoint)(['format' => $format]);
    $delivery = ($this->delivery)($endpoint);
    $target = Mockery::mock(WebhookTarget::class);
    $target->shouldReceive('resolve')->once()->andReturn(['url' => 'https://hooks.example.com/events', 'host' => 'hooks.example.com', 'ip' => $ip]);
    Http::fake(function ($request, $options) use ($endpoint, $delivery, $format, $ip) {
        expect($request->method())->toBe('POST')->and($options['allow_redirects'])->toBeFalse()->and($options['verify'])->toBeTrue()->and($options['proxy'])->toBe('')->and($options['cookies'])->toBeFalse();
        expect($options['curl'][CURLOPT_RESOLVE])->toBe(['hooks.example.com:443:' . (str_contains($ip, ':') ? '[' . $ip . ']' : $ip)]);
        $options['on_headers'](new GuzzleHttp\Psr7\Response(204));
        expect($options['sink']->write('discarded'))->toBe(9);
        if ($format === 'json') {
            $timestamp = $request->header('X-Aquadactyl-Timestamp')[0];
            expect($request->header('X-Aquadactyl-Signature')[0])->toBe('sha256=' . hash_hmac('sha256', $timestamp . '.' . $request->body(), $endpoint->signing_secret))->and($request->data())->toBe($delivery->payload);
        } else {
            expect($request->data()['allowed_mentions']['parse'])->toBe([])->and($request->header('X-Aquadactyl-Signature'))->toBe([]);
        }

        return Http::response('', 204, ['Retry-After' => '1.5']);
    });
    expect((new WebhookTransport($target))->send($endpoint, $delivery))->toBe(['status' => 204, 'retry_after' => 2]);
})->with([['json', '1.1.1.1'], ['discord', '2606:4700:4700::1111']]);

test('oversized and failed webhook responses and missing cURL fail without leaking URLs', function (string $failure) {
    $endpoint = ($this->endpoint)();
    $delivery = ($this->delivery)($endpoint);
    $target = Mockery::mock(WebhookTarget::class);
    $target->shouldReceive('resolve')->once()->andReturn(['url' => 'https://hooks.example.com/events', 'host' => 'hooks.example.com', 'ip' => '1.1.1.1']);
    if ($failure === 'curl') {
        $transport = new class($target) extends WebhookTransport {
            protected function curlAvailable(): bool
            {
                return false;
            }
        };
        expect(fn () => $transport->send($endpoint, $delivery))->toThrow(RuntimeException::class, 'cURL');

        return;
    }
    Http::fake(function ($request, $options) use ($failure) {
        if ($failure === 'headers') {
            $options['on_headers'](new GuzzleHttp\Psr7\Response(200, ['Content-Length' => '999999']));
        }
        if ($failure === 'body') {
            $options['sink']->write(str_repeat('x', 65537));
        }
        throw new RuntimeException('private URL must never escape');
    });
    expect(fn () => (new WebhookTransport($target))->send($endpoint, $delivery))->toThrow(RuntimeException::class, 'could not be reached securely');
})->with(['headers', 'body', 'network', 'curl']);

test('system action payloads exclude arbitrary properties and wait for subjects while webhook management avoids loops', function () {
    ($this->endpoint)();
    $listener = app(SendSystemActionWebhook::class);
    foreach (['auth:success', 'server:file.read', 'admin:request'] as $action) {
        $activity = ActivityLog::create(['ip' => '127.0.0.1', 'event' => $action, 'properties' => ['route' => 'admin.settings.webhooks.store', 'secret' => 'private']]);
        $listener->handle(new ActivityLogged($activity));
    }
    expect(WebhookDelivery::count())->toBe(0);
    $activity = ActivityLog::create(['ip' => '127.0.0.1', 'event' => 'admin:request', 'properties' => ['route' => 'admin.servers.view', 'method' => 'PATCH', 'status' => 200, 'secret' => 'private', 'password' => 'password']]);
    $activity->subjects()->create(['subject_type' => 'server', 'subject_id' => 123]);
    $listener->handle(new ActivityLogged($activity));
    $listener->handle(new ActivityLogged(ActivityLog::create(['ip' => '127.0.0.1', 'event' => 'server:power.start', 'properties' => ['command' => 'secret']])));
    expect(WebhookDelivery::count())->toBe(2);
    $data = WebhookDelivery::first()->payload['data'];
    expect($data)->toHaveKeys(['action', 'activity_id', 'actor_id', 'subjects', 'route', 'method', 'status'])->not->toHaveKeys(['password', 'secret', 'command'])->and($data['subjects'])->toBe([['type' => 'server', 'id' => 123]]);
    WebhookEndpoint::query()->update(['enabled' => false]);
    WebhookEmitter::clearSubscriptions();
    $listener->handle(new ActivityLogged($activity));
    $mock = Mockery::mock(WebhookEmitter::class);
    $mock->shouldReceive('subscribed')->andThrow(new RuntimeException('secret'));
    app()->instance(WebhookEmitter::class, $mock);
    Log::spy();
    $listener->handle(new ActivityLogged($activity));
    Log::shouldHaveReceived('warning')->once()->with('A system-action webhook could not be recorded.');
});

test('status notifications report transitions and incident lifecycle without repeated healthy notifications', function () {
    ($this->endpoint)();
    $server = $this->createServerModel();
    $component = StatusComponent::create(['node_id' => $server->node_id, 'name' => 'Published label']);
    $service = app(StatusPageService::class);
    $record = new ReflectionMethod($service, 'record');
    foreach (['up', 'up', 'down', 'up'] as $status) {
        $record->invoke($service, $component->id, $status);
    }
    $record->invoke($service, 99999999, 'down');
    expect(WebhookDelivery::where('event_type', 'status.health.changed')->count())->toBe(2);
    $incident = StatusIncident::create(['title' => 'Connectivity', 'message' => 'Investigating', 'status' => 'investigating']);
    $incident->update(['message' => 'Working on recovery']);
    $incident->update(['status' => 'resolved']);
    $incident->touch();
    $incident->delete();
    expect(WebhookDelivery::where('event_type', 'like', 'status.incident.%')->pluck('event_type')->all())->toBe(['status.incident.published', 'status.incident.updated', 'status.incident.resolved', 'status.incident.removed']);
});
