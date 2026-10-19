<?php

use GuzzleHttp\Client;
use GuzzleHttp\HandlerStack;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use GuzzleHttp\Psr7\Response;
use GuzzleHttp\Handler\MockHandler;
use Pterodactyl\Models\StatusCheck;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\StatusIncident;
use Pterodactyl\Models\StatusComponent;
use Pterodactyl\Services\Status\StatusPageService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Integrations\IntegrationSettings;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set('pterodactyl.auth.2fa_required', 0);
    Cache::forget('status-page:snapshot');
    $this->settings = app(IntegrationSettings::class);
    $this->settings->set('status:enabled', '0');
    $this->settings->set('status:visibility', 'signed_in');
    $this->status = app(StatusPageService::class);
    $this->admin = User::factory()->create(['root_admin' => true]);
    $this->node = fn (array $attributes = []) => Node::factory()->create(array_merge(['location_id' => Pterodactyl\Models\Location::factory()->create()->id], $attributes));
});

test('status pages are disabled by default and private status requires authentication', function () {
    $this->get('/status')->assertNotFound();
    $this->settings->set('status:enabled', '1');
    $this->get('/status')->assertRedirect('/auth/login');
    $this->actingAs($this->admin)->get('/status')->assertOk()->assertHeader('Cache-Control', 'no-store, private')->assertSee('No services have been published');
});

test('public status exposes only explicitly published labels and escaped notices even during panel maintenance', function () {
    $node = ($this->node)(['name' => 'SECRET-NODE-NAME', 'fqdn' => 'secret-daemon.example.test']);
    StatusComponent::create(['node_id' => $node->id, 'name' => 'Europe hosting']);
    $this->settings->set('status:enabled', '1');
    $this->settings->set('status:visibility', 'public');
    $this->settings->set('status:description', '<script>hidden()</script>');
    StatusIncident::create(['title' => 'Network issue', 'message' => '<script>attack()</script>', 'status' => 'investigating']);
    config()->set('aquadactyl.maintenance.enabled', true);
    $this->get('/status')->assertOk()->assertSee('Europe hosting')->assertSee('Network issue')->assertSee('Panel maintenance')
        ->assertSee('&lt;script&gt;attack()&lt;/script&gt;', false)->assertDontSee('<script>attack()', false)->assertDontSee('secret-daemon.example.test')->assertDontSee('SECRET-NODE-NAME')->assertDontSee($node->daemon_token);
});

test('private status rejects a session invalidated by an account password change', function () {
    $this->settings->set('status:enabled', '1');
    $oldHash = $this->admin->password;
    $this->admin->update(['password' => Illuminate\Support\Facades\Hash::make('new-status-password')]);
    $this->withHeader('Accept', 'text/html')->actingAs($this->admin)->withSession(['password_hash_web' => $oldHash])->get('/status')->assertRedirect('/auth/login');
    $this->assertGuest();
});

test('status configuration publishing and incident lifecycle are administrator only and invalidate cached snapshots', function () {
    $this->actingAs(User::factory()->create(['root_admin' => false]))->get('/admin/settings/status')->assertForbidden();
    $this->post('/admin/settings/status/components', [])->assertForbidden();
    $this->actingAs($this->admin)->get('/admin/settings/status')->assertOk();
    $this->patch('/admin/settings/status', ['enabled' => 1, 'visibility' => 'public', 'title' => 'Hosting status', 'description' => 'Our services'])->assertRedirect('/admin/settings/status');
    expect($this->settings->statusEnabled())->toBeTrue();
    $node = ($this->node)();
    $this->status->snapshot();
    $this->post('/admin/settings/status/components', ['node_id' => $node->id, 'name' => 'Game hosting'])->assertRedirect();
    expect($this->status->snapshot()['components'])->toHaveCount(1);
    $this->postJson('/admin/settings/status/components', ['node_id' => $node->id, 'name' => 'Duplicate'])->assertUnprocessable();
    $this->post('/admin/settings/status/incidents', ['title' => 'Incident', 'message' => 'Investigating connectivity.', 'status' => 'investigating'])->assertRedirect();
    $incident = StatusIncident::latest('id')->firstOrFail();
    $this->patch('/admin/settings/status/incidents/' . $incident->id, ['title' => 'Incident', 'message' => 'Recovered.', 'status' => 'resolved'])->assertRedirect();
    $resolvedAt = $incident->fresh()->resolved_at->toIso8601String();
    $this->patch('/admin/settings/status/incidents/' . $incident->id, ['title' => 'Incident', 'message' => 'Recovered and stable.', 'status' => 'resolved'])->assertRedirect();
    expect($incident->fresh()->resolved_at->toIso8601String())->toBe($resolvedAt);
    $this->get('/admin/settings/status')->assertOk()->assertSee('Game hosting')->assertSee('Recovered and stable.');
    $this->get('/status')->assertOk()->assertSee('Recently resolved');
    $this->delete('/admin/settings/status/components/' . StatusComponent::where('node_id', $node->id)->value('id'))->assertRedirect();
    expect($this->status->snapshot()['components'])->toBeEmpty();
    $this->patchJson('/admin/settings/status', ['enabled' => 1, 'visibility' => 'unrestricted'])->assertUnprocessable();
});

test('status snapshots distinguish unknown stale maintenance and outages without fabricating availability', function (string $state, string $overall) {
    $component = StatusComponent::create(['node_id' => ($this->node)()->id, 'name' => 'Monitored service']);
    if ($state !== 'none') {
        StatusCheck::create(['status_component_id' => $component->id, 'status' => $state === 'stale' ? 'up' : $state, 'checked_at' => $state === 'stale' ? now()->subMinutes(4) : now()]);
    }
    $snapshot = $this->status->snapshot();
    expect($snapshot['overall'])->toBe($overall);
    expect($snapshot['components'][0]['status'])->toBe(in_array($state, ['none', 'stale'], true) ? 'unknown' : $state);
    expect($snapshot['components'][0]['availability'])->toBe(match ($state) {
        'up', 'stale' => 100.0, 'down' => 0.0, default => null,
    });
})->with([['none', 'unknown'], ['stale', 'unknown'], ['up', 'up'], ['down', 'disruption'], ['maintenance', 'maintenance']]);

test('availability excludes maintenance and missing samples and active incidents change overall status', function () {
    $component = StatusComponent::create(['node_id' => ($this->node)()->id, 'name' => 'Service']);
    foreach (['up', 'up', 'down', 'maintenance', 'up'] as $state) {
        StatusCheck::create(['status_component_id' => $component->id, 'status' => $state, 'checked_at' => now()]);
    }
    StatusIncident::create(['title' => 'Investigating reports', 'message' => 'Update to follow.', 'status' => 'monitoring']);
    expect($this->status->snapshot()['components'][0]['availability'])->toBe(75.0)->and($this->status->snapshot()['overall'])->toBe('disruption');
});

test('scheduled health checks are bounded and record operational unavailable and maintenance states', function () {
    $this->settings->set('status:enabled', '1');
    $components = collect();
    foreach ([false, false, false, true] as $maintenance) {
        $components->push(StatusComponent::create(['node_id' => ($this->node)(['maintenance_mode' => $maintenance])->id, 'name' => 'Service']));
    }
    $handler = new MockHandler([new Response(200, [], '{"version":"1.13.0"}'), new Response(200, [], '{}'), new RuntimeException('private-daemon-token')]);
    $client = new Client(['handler' => HandlerStack::create($handler)]);
    $this->mock(DaemonConfigurationRepository::class)->shouldReceive('setNode')->times(3)->andReturnSelf()->shouldReceive('getHttpClient')->times(3)->andReturn($client);
    StatusCheck::create(['status_component_id' => $components[0]->id, 'status' => 'up', 'checked_at' => now()->subDays(31)]);
    $this->artisan('p:status:collect')->assertSuccessful();
    expect(StatusCheck::orderBy('id')->pluck('status')->sort()->values()->all())->toBe(['down', 'down', 'maintenance', 'up']);
});

test('disabled checks do not contact daemons and a failed client initialization records an outage', function () {
    $component = StatusComponent::create(['node_id' => ($this->node)()->id, 'name' => 'Service']);
    $this->status->collect($this->settings);
    expect(StatusCheck::where('status_component_id', $component->id)->count())->toBe(0);
    $this->settings->set('status:enabled', '1');
    $this->mock(DaemonConfigurationRepository::class)->shouldReceive('setNode')->once()->andThrow(new RuntimeException('private'));
    $this->status->collect($this->settings);
    expect(StatusCheck::where('status_component_id', $component->id)->value('status'))->toBe('down');
});

test('unpublished components are not recreated by an in flight probe', function () {
    $this->settings->set('status:enabled', '1');
    $component = StatusComponent::create(['node_id' => ($this->node)()->id, 'name' => 'Service']);
    $this->mock(DaemonConfigurationRepository::class)->shouldReceive('setNode')->andReturnSelf()->shouldReceive('getHttpClient')->andReturnUsing(function () use ($component) {
        $component->delete();

        return new Client(['handler' => HandlerStack::create(new MockHandler([new Response(200, [], '{"version":"1"}')]))]);
    });
    $this->status->collect($this->settings);
    expect(StatusCheck::where('status_component_id', $component->id)->count())->toBe(0);
});
