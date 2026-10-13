<?php

use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Mount;
use Pterodactyl\Models\Location;
use Pterodactyl\Models\Allocation;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Helpers\SoftwareVersionService;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set('pterodactyl.auth.2fa_required', 0);
    app('cache')->forever(SoftwareVersionService::VERSION_CACHE_KEY, ['panel' => '1.0.0', 'wings' => '1.0.0']);
    $this->actingAs(User::factory()->create(['root_admin' => true]));
});

test('node system information normalizes daemon values and supports older daemons with missing fields', function (bool $complete) {
    $node = Node::factory()->for(Location::factory())->create();
    $this->mock(DaemonConfigurationRepository::class)->shouldReceive('setNode')->once()->with(Mockery::on(fn ($model) => $model->id === $node->id))->andReturnSelf()
        ->shouldReceive('getSystemInformation')->once()->andReturn($complete ? ['version' => '1.0.0', 'os' => 'linux', 'architecture' => 'amd64', 'kernel_version' => '6.0', 'cpu_count' => '4'] : []);
    $this->getJson('/admin/nodes/view/' . $node->id . '/system-information')->assertOk()->assertExactJson($complete ? ['version' => '1.0.0', 'system' => ['type' => 'Linux', 'arch' => 'amd64', 'release' => '6.0', 'cpus' => 4]] : ['version' => '', 'system' => ['type' => 'Unknown', 'arch' => '--', 'release' => '--', 'cpus' => 0]]);
})->with([true, false]);

test('administrators can create edit and remove an unused location', function () {
    $this->post('/admin/locations', ['short' => 'coverage', 'long' => 'Coverage location'])->assertRedirect();
    $location = Location::query()->where('short', 'coverage')->firstOrFail();
    $this->get('/admin/locations/view/' . $location->id)->assertOk()->assertSee('Coverage location');
    $this->patch('/admin/locations/view/' . $location->id, ['short' => 'renamed', 'long' => 'Updated location'])->assertRedirect();
    expect($location->fresh()->short)->toBe('renamed');
    $this->patch('/admin/locations/view/' . $location->id, ['action' => 'delete', 'short' => 'renamed'])->assertRedirect(route('admin.locations'));
    $this->assertDatabaseMissing('locations', ['id' => $location->id]);
});

test('a location with nodes cannot be removed and displays an actionable alert', function () {
    $location = Location::factory()->create();
    Node::factory()->create(['location_id' => $location->id]);
    $this->patch('/admin/locations/view/' . $location->id, ['action' => 'delete', 'short' => $location->short])
        ->assertRedirect(route('admin.locations.view', $location->id));
    $this->assertDatabaseHas('locations', ['id' => $location->id]);
    expect(app(Prologue\Alerts\AlertsMessageBag::class)->get('danger'))->not->toBeEmpty();
});

test('mount creation modification association and deletion persist correctly', function () {
    $payload = ['name' => 'Coverage mount', 'description' => 'Shared files', 'source' => '/srv/shared', 'target' => '/mnt/shared', 'read_only' => 1, 'user_mountable' => 1];
    $this->post('/admin/mounts', $payload)->assertRedirect();
    $mount = Mount::query()->where('name', 'Coverage mount')->firstOrFail();
    expect($mount->uuid)->toMatch('/^[a-f0-9-]{36}$/');
    $this->get('/admin/mounts/view/' . $mount->id)->assertOk()->assertSee('/srv/shared');
    $this->patch('/admin/mounts/view/' . $mount->id, array_replace($payload, ['name' => 'Renamed mount']))->assertRedirect();
    expect($mount->fresh()->name)->toBe('Renamed mount');
    $egg = Egg::query()->firstOrFail();
    $node = Node::factory()->create(['location_id' => Location::factory()->create()->id]);
    $this->post('/admin/mounts/' . $mount->id . '/eggs', ['eggs' => [$egg->id]])->assertRedirect();
    $this->post('/admin/mounts/' . $mount->id . '/nodes', ['nodes' => [$node->id]])->assertRedirect();
    expect($mount->eggs()->pluck('eggs.id')->all())->toBe([$egg->id]);
    expect($mount->nodes()->pluck('nodes.id')->all())->toBe([$node->id]);
    $this->delete('/admin/mounts/' . $mount->id . '/eggs/' . $egg->id)->assertNoContent();
    $this->delete('/admin/mounts/' . $mount->id . '/nodes/' . $node->id)->assertNoContent();
    expect($mount->eggs()->count())->toBe(0)->and($mount->nodes()->count())->toBe(0);
    $this->patch('/admin/mounts/view/' . $mount->id, array_replace($payload, ['action' => 'delete', 'name' => 'Renamed mount']))->assertRedirect(route('admin.mounts'));
    $this->assertDatabaseMissing('mounts', ['id' => $mount->id]);
});

test('mounts reject protected filesystem paths', function (string $source, string $target) {
    $this->postJson('/admin/mounts', ['name' => 'Forbidden mount', 'source' => $source, 'target' => $target])
        ->assertUnprocessable();
    $this->assertDatabaseMissing('mounts', ['name' => 'Forbidden mount']);
})->with([['/etc/pterodactyl', '/mnt/shared'], ['/srv/shared', '/home/container']]);

test('node creation generates encrypted credentials and an unused node can be deleted', function () {
    $location = Location::factory()->create();
    $payload = ['name' => 'Coverage node', 'location_id' => $location->id, 'fqdn' => '127.0.0.1', 'scheme' => 'http', 'memory' => 4096, 'memory_overallocate' => 0, 'disk' => 8192, 'disk_overallocate' => 0, 'daemonListen' => 8080, 'daemonSFTP' => 2022];
    $this->post('/admin/nodes/new', $payload)->assertRedirect();
    $node = Node::query()->where('name', 'Coverage node')->firstOrFail();
    expect(strlen($node->getDecryptedKey()))->toBe(Node::DAEMON_TOKEN_LENGTH)
        ->and(strlen($node->daemon_token_id))->toBe(Node::DAEMON_TOKEN_ID_LENGTH)
        ->and($node->toArray())->not->toHaveKeys(['daemon_token', 'daemon_token_id']);
    $this->delete('/admin/nodes/view/' . $node->id . '/delete')->assertRedirect(route('admin.nodes'));
    $this->assertDatabaseMissing('nodes', ['id' => $node->id]);
});

test('editing a node resets credentials when requested and sends the updated configuration', function () {
    $node = Node::factory()->create(['location_id' => Location::factory()->create()->id, 'fqdn' => '127.0.0.1', 'scheme' => 'http']);
    $oldToken = $node->daemon_token_id;
    $daemon = $this->mock(DaemonConfigurationRepository::class);
    $daemon->shouldReceive('setNode')->once()->with(Mockery::on(fn ($value) => $value->id === $node->id))->andReturnSelf();
    $daemon->shouldReceive('update')->once()->with(Mockery::on(fn ($value) => $value->name === 'Updated node' && $value->daemon_token_id !== $oldToken));
    $this->patch('/admin/nodes/view/' . $node->id . '/settings', array_merge($node->getAttributes(), ['name' => 'Updated node', 'reset_secret' => 'on']))
        ->assertRedirect(route('admin.nodes.view.settings', $node->id));
    expect($node->fresh()->name)->toBe('Updated node')->and($node->fresh()->daemon_token_id)->not->toBe($oldToken);
});

test('a Wings configuration failure retains the saved node settings and warns the administrator', function () {
    $node = Node::factory()->create(['location_id' => Location::factory()->create()->id, 'fqdn' => '127.0.0.1', 'scheme' => 'http']);
    $daemon = $this->mock(DaemonConfigurationRepository::class);
    $daemon->shouldReceive('setNode')->andReturnSelf();
    $daemon->shouldReceive('update')->once()->andThrow(new DaemonConnectionException(new GuzzleHttp\Exception\ConnectException('offline', new GuzzleHttp\Psr7\Request('POST', 'http://127.0.0.1'))));
    $this->patch('/admin/nodes/view/' . $node->id . '/settings', array_merge($node->getAttributes(), ['name' => 'Saved offline node']))->assertRedirect();
    expect($node->fresh()->name)->toBe('Saved offline node');
    expect(app(Prologue\Alerts\AlertsMessageBag::class)->get('danger'))->not->toBeEmpty();
});

test('allocation blocks expand ports deduplicate existing allocations and preserve assigned ports', function () {
    $server = $this->createServerModel();
    $node = $server->node;
    $url = '/admin/nodes/view/' . $node->id . '/allocation';
    $payload = ['allocation_ip' => '192.0.2.8/31', 'allocation_ports' => ['28000-28001', '28000'], 'allocation_alias' => 'games.example.test'];
    $this->post($url, $payload)->assertRedirect();
    $this->post($url, $payload)->assertRedirect();
    expect($node->allocations()->whereBetween('port', [28000, 28001])->count())->toBe(4);
    $allocation = $node->allocations()->where('port', 28000)->firstOrFail();
    $this->post($url . '/alias', ['allocation_id' => $allocation->id, 'alias' => 'play.example.test'])->assertNoContent();
    expect($allocation->fresh()->ip_alias)->toBe('play.example.test');
    $this->post($url . '/alias', ['allocation_id' => $allocation->id, 'alias' => ''])->assertNoContent();
    expect($allocation->fresh()->ip_alias)->toBeNull();
    $this->post($url . '/remove', ['ip' => '192.0.2.8'])->assertRedirect();
    expect($node->allocations()->where('ip', '192.0.2.8')->count())->toBe(0);
    $this->assertDatabaseHas('allocations', ['id' => $server->allocation_id, 'server_id' => $server->id]);
});

test('unassigned allocations can be removed individually or in a selection', function (bool $multiple) {
    $node = Node::factory()->create(['location_id' => Location::factory()->create()->id]);
    $allocations = Allocation::factory()->count(2)->create(['node_id' => $node->id]);
    if ($multiple) {
        $this->deleteJson('/admin/nodes/view/' . $node->id . '/allocations', ['allocations' => $allocations->map(fn ($item) => ['id' => $item->id])->all()])->assertNoContent();
    } else {
        foreach ($allocations as $allocation) {
            $this->delete('/admin/nodes/view/' . $node->id . '/allocation/remove/' . $allocation->id)->assertNoContent();
        }
    }
    expect($node->allocations()->count())->toBe(0);
})->with([true, false]);

test('assigned allocations and nodes with active servers cannot be removed', function (string $resource) {
    $server = $this->createServerModel();
    $url = '/admin/nodes/view/' . $server->node_id . ($resource === 'node' ? '/delete' : '/allocation/remove/' . $server->allocation_id);
    $this->withoutExceptionHandling();
    expect(fn () => $this->deleteJson($url))->toThrow($resource === 'node' ? Pterodactyl\Exceptions\Service\HasActiveServersException::class : Pterodactyl\Exceptions\Service\Allocation\ServerUsingAllocationException::class);
    $this->assertDatabaseHas('nodes', ['id' => $server->node_id]);
    $this->assertDatabaseHas('allocations', ['id' => $server->allocation_id, 'server_id' => $server->id]);
})->with(['node', 'allocation']);
