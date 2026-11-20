<?php

use GuzzleHttp\Client;
use Pterodactyl\Models\User;
use GuzzleHttp\Psr7\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Pterodactyl\Models\SoftwareUpdate;
use Pterodactyl\Models\WebhookDelivery;
use Pterodactyl\Models\WebhookEndpoint;
use Pterodactyl\Services\Updates\ReleaseCatalog;
use Pterodactyl\Services\Updates\SoftwareMonitor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Integrations\IntegrationSettings;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;

uses(DatabaseTransactions::class);

beforeEach(function () {
    Cache::flush();
    Queue::fake();
    Http::preventStrayRequests();
    config()->set('pterodactyl.auth.2fa_required', 0);
    app(IntegrationSettings::class)->set('updates:daemon_products', '{}');
});

test('beta and stable release feeds are cached separately for each official daemon repository', function () {
    Http::fake(fn ($request) => Http::response(str_contains($request->url(), '?per_page=30') ? [
        ['tag_name' => 'v99.0-beta.1', 'draft' => true, 'body' => 'Draft'],
        ['tag_name' => 'canary', 'prerelease' => true],
        ['tag_name' => 'v1.1-beta.4', 'prerelease' => true, 'body' => 'Manta beta notes', 'html_url' => 'https://evil.example'],
        ['tag_name' => 'v1.1-beta.3', 'prerelease' => true, 'body' => 'Older'],
        ['tag_name' => 'v1.0.0', 'body' => 'Stable'],
        ['tag_name' => []], null,
    ] : ['tag_name' => 'v1.13.5', 'body' => str_contains($request->url(), '/Aquadactyl/manta/') ? 'Manta stable notes' : 'Wings stable notes'], 200));
    $catalog = app(ReleaseCatalog::class);
    $manta = $catalog->latest('manta', '1.1-beta.3');
    expect($manta['tag'])->toBe('v1.1-beta.4')->and($manta['notes'])->toBe('Manta beta notes')
        ->and($manta['url'])->toBe('https://github.com/Aquadactyl/manta/releases/tag/v1.1-beta.4');
    expect($catalog->latest('wings', '1.13.4')['notes'])->toBe('Wings stable notes');
    expect($catalog->latest('manta')['notes'])->toBe('Manta stable notes');
    expect($catalog->latest('manta', '1.1-beta.3'))->toBe($manta);
    Http::assertSentCount(3);
    Http::assertSent(fn ($r) => $r->url() === 'https://api.github.com/repos/Aquadactyl/manta/releases?per_page=30');
    Http::assertSent(fn ($r) => $r->url() === 'https://api.github.com/repos/pterodactyl/wings/releases/latest');
});

test('a beta installation can graduate to a newer stable release without selecting an older beta', function () {
    Http::fake(['*' => Http::response([
        ['tag_name' => 'v1.1-beta.8', 'prerelease' => true],
        ['tag_name' => 'v1.1.0', 'body' => 'Stable graduation'],
        ['tag_name' => 'v1.1-beta.9', 'prerelease' => true],
    ])]);
    expect(app(ReleaseCatalog::class)->latest('manta', '1.1-beta.3')['tag'])->toBe('v1.1.0');
});

test('panel beta labels match their feed while installed panel notes remain tied to the exact tag', function () {
    config()->set('app.version', '1.1-beta.4');
    Http::fake(fn ($request) => Http::response(str_contains($request->url(), '?per_page=30')
        ? [['tag_name' => 'v1.1-beta.5', 'prerelease' => true, 'body' => 'Next panel notes']]
        : ['tag_name' => '1.1-beta.4', 'prerelease' => true, 'body' => 'Installed panel notes']));
    app(SoftwareMonitor::class)->observe('panel', 'panel', '1.1-beta.4', null);
    $this->actingAs(User::factory()->create(['root_admin' => true]));
    foreach (['/admin', '/admin/settings/updates'] as $path) {
        $this->get($path)->assertOk()->assertSee('Latest release (including prereleases)')
            ->assertSee('v1.1-beta.5')->assertSee('Installed panel notes')->assertDontSee('Next panel notes');
    }
});

test('prerelease feed failures never fall back to another product or stable-only notes', function ($payload, int $status, bool $error) {
    Http::fake(['*' => Http::response($payload, $status)]);
    $result = app(ReleaseCatalog::class)->latest('manta', '1.1-beta.3');
    expect($result['tag'])->toBeNull()->and($result['notes'])->toBe('')->and($result['error'] !== null)->toBe($error)
        ->and($result['url'])->toBe('https://github.com/Aquadactyl/manta/releases');
    Http::assertSentCount(1);
})->with([[[], 200, false], [[['tag_name' => 'canary']], 200, false], [['tag_name' => 'v1.1-beta.4'], 200, true], [[], 404, false], [[], 503, true], ['bad json', 200, true], [str_repeat('x', 1048577), 200, true]]);

test('existing Manta betas repair misclassified Wings state and select beta notes while Wings stays on its own feed', function () {
    $server = $this->createServerModel();
    $id = $server->node_id;
    SoftwareUpdate::create(['component' => 'node:' . $id, 'node_id' => $id, 'product' => 'wings', 'installed_version' => '1.1-beta.3', 'latest_version' => 'v1.13.5', 'release_notes' => 'Wrong Wings notes', 'release_url' => 'https://github.com/pterodactyl/wings/releases/tag/v1.13.5']);
    $endpoint = WebhookEndpoint::create(['name' => 'Updates', 'format' => 'json', 'url' => 'https://example.com/hook', 'signing_secret' => str_repeat('s', 32), 'events' => ['updates.available', 'updates.installed'], 'enabled' => true]);
    Http::fake(fn ($r) => Http::response(str_contains($r->url(), '/Aquadactyl/manta/') ? [['tag_name' => 'v1.1-beta.4', 'prerelease' => true, 'body' => 'Correct Manta notes']] : ['tag_name' => 'v1.13.5', 'body' => 'Wings notes']));
    $info = ['version' => '1.1-beta.3', 'capabilities' => ['system_usage' => true]];
    $client = new Client(['handler' => fn () => GuzzleHttp\Promise\Create::promiseFor(new Response(200, [], json_encode($info)))]);
    $repository = Mockery::mock(DaemonConfigurationRepository::class);
    $repository->shouldReceive('setNode')->andReturnSelf();
    $repository->shouldReceive('getHttpClient')->andReturn($client);
    app()->instance(DaemonConfigurationRepository::class, $repository);
    app(SoftwareMonitor::class)->check(true);
    $state = SoftwareUpdate::where('component', 'node:' . $id)->firstOrFail();
    expect($state->product)->toBe('manta')->and($state->latest_version)->toBe('v1.1-beta.4')->and($state->release_notes)->toBe('Correct Manta notes');
    $deliveries = fn (string $event) => WebhookDelivery::where('webhook_endpoint_id', $endpoint->id)->where('event_type', $event)->get()
        ->filter(fn ($delivery) => ($delivery->payload['data']['component'] ?? null) === 'node:' . $id)->count();
    expect($deliveries('updates.available'))->toBe(1)->and($deliveries('updates.installed'))->toBe(0);
    $response = $this->actingAs(User::factory()->create(['root_admin' => true]))->get('/admin/settings/updates')->assertOk();
    $response->assertSee('Manta')->assertSee('Correct Manta notes')->assertSee('Latest release (including prereleases)')->assertDontSee('Wrong Wings notes');
    app(SoftwareMonitor::class)->observe('node:' . $id, 'wings', '1.13.4', $id);
    $state->refresh();
    expect($state->product)->toBe('wings')->and($state->release_notes)->toBe('Wings notes')
        ->and($state->release_url)->toBe('https://github.com/pterodactyl/wings/releases/tag/v1.13.5');
    expect($deliveries('updates.installed'))->toBe(0);
});

test('ambiguous daemon builds clear stale notes and manual overrides hide notes for a different product', function () {
    $server = $this->createServerModel();
    Http::fake(['*' => Http::response(['tag_name' => 'v1.13.5', 'body' => 'Unrelated notes'])]);
    $monitor = app(SoftwareMonitor::class);
    $monitor->observe('node:' . $server->node_id, 'unknown', 'custom-build', $server->node_id);
    $state = SoftwareUpdate::where('component', 'node:' . $server->node_id)->firstOrFail();
    expect($state->latest_version)->toBeNull()->and($state->release_url)->toBeNull()->and($state->release_notes)->toBe('')->and($state->last_error)->not->toBeNull();
    Http::assertNothingSent();
    $monitor->observe('node:' . $server->node_id, 'wings', '1.13.4', $server->node_id);
    app(IntegrationSettings::class)->set('updates:daemon_products', json_encode([$server->node_id => 'manta']));
    $this->actingAs(User::factory()->create(['root_admin' => true]))->get('/admin/settings/updates')->assertOk()->assertDontSee('Unrelated notes');
});
