<?php

use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Allocation;
use GuzzleHttp\Exception\RequestException;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;
use Pterodactyl\Services\Servers\BuildModificationService;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

beforeEach(function () {
    $this->daemonServerRepository = $this->mock(DaemonServerRepository::class);
});

test('allocations can be modified for the server', function () {
    $server = $this->createServerModel();
    $server2 = $this->createServerModel();

    /** @var \Pterodactyl\Models\Allocation[] $allocations */
    $allocations = Allocation::factory()->times(4)->create(['node_id' => $server->node_id, 'notes' => 'Random notes']);

    $initialAllocationId = $server->allocation_id;
    $allocations[0]->update(['server_id' => $server->id, 'notes' => 'Test notes']);

    // Some additional test allocations for the other server, not the server we are attempting
    // to modify.
    $allocations[2]->update(['server_id' => $server2->id]);
    $allocations[3]->update(['server_id' => $server2->id]);

    $this->daemonServerRepository->expects('setServer->sync')->andReturnUndefined();

    $response = app(BuildModificationService::class)->handle($server, [
        // Attempt to add one new allocation, and an allocation assigned to another server. The
        // other server allocation should be ignored, and only the allocation for this server should
        // be used.
        'add_allocations' => [$allocations[2]->id, $allocations[1]->id],
        // Remove the default server allocation, ensuring that the new allocation passed through
        // in the data becomes the default allocation.
        'remove_allocations' => [$server->allocation_id, $allocations[0]->id, $allocations[3]->id],
    ]);

    expect($response)->toBeInstanceOf(Server::class)
        // Only one allocation should exist for this server now.
        ->and($response->allocations)->toHaveCount(1)
        ->and($response->allocation_id)->toBe($allocations[1]->id)
        ->and($response->allocation->notes)->toBeNull();

    // These two allocations should not have been touched.
    $this->assertDatabaseHas('allocations', ['id' => $allocations[2]->id, 'server_id' => $server2->id]);
    $this->assertDatabaseHas('allocations', ['id' => $allocations[3]->id, 'server_id' => $server2->id]);

    // Both of these allocations should have been removed from the server, and have had their
    // notes properly reset.
    $this->assertDatabaseHas('allocations', ['id' => $initialAllocationId, 'server_id' => null, 'notes' => null]);
    $this->assertDatabaseHas('allocations', ['id' => $allocations[0]->id, 'server_id' => null, 'notes' => null]);
});

test('exception is thrown if removing the default allocation', function () {
    $server = $this->createServerModel();
    /** @var \Pterodactyl\Models\Allocation[] $allocations */
    $allocations = Allocation::factory()->times(4)->create(['node_id' => $server->node_id]);

    $allocations[0]->update(['server_id' => $server->id]);

    $this->expectException(DisplayException::class);
    $this->expectExceptionMessage('You are attempting to delete the default allocation for this server but there is no fallback allocation to use.');

    app(BuildModificationService::class)->handle($server, [
        'add_allocations' => [],
        'remove_allocations' => [$server->allocation_id, $allocations[0]->id],
    ]);
});

test('server build data is properly updated on wings', function () {
    $server = $this->createServerModel();

    $this->daemonServerRepository->expects('setServer')->with(Mockery::on(function (Server $s) use ($server) {
        return $s->id === $server->id;
    }))->andReturnSelf();

    $this->daemonServerRepository->expects('sync')->withNoArgs()->andReturnUndefined();

    $response = app(BuildModificationService::class)->handle($server, [
        'oom_disabled' => false,
        'memory' => 256,
        'swap' => 128,
        'io' => 600,
        'cpu' => 150,
        'threads' => '1,2',
        'disk' => 1024,
        'backup_limit' => null,
        'database_limit' => 10,
        'allocation_limit' => 20,
    ]);

    expect($response->oom_disabled)->toBeFalse()
        ->and($response->memory)->toBe(256)
        ->and($response->swap)->toBe(128)
        ->and($response->io)->toBe(600)
        ->and($response->cpu)->toBe(150)
        ->and($response->threads)->toBe('1,2')
        ->and($response->disk)->toBe(1024)
        ->and($response->backup_limit)->toBe(0)
        ->and($response->database_limit)->toBe(10)
        ->and($response->allocation_limit)->toBe(20);
});

test('connection exception is ignored when updating server settings', function () {
    $server = $this->createServerModel();

    $this->daemonServerRepository->expects('setServer->sync')->andThrows(
        new DaemonConnectionException(
            new RequestException('Bad request', new Request('GET', '/test'), new Response())
        )
    );

    $response = app(BuildModificationService::class)->handle($server, ['memory' => 256, 'disk' => 10240]);

    expect($response)->toBeInstanceOf(Server::class)
        ->and($response->memory)->toBe(256)
        ->and($response->disk)->toBe(10240);

    $this->assertDatabaseHas('servers', ['id' => $response->id, 'memory' => 256, 'disk' => 10240]);
});

test('no exception is thrown if only removing allocation', function () {
    $server = $this->createServerModel();
    /** @var Allocation $allocation */
    $allocation = Allocation::factory()->create(['node_id' => $server->node_id, 'server_id' => $server->id]);

    $this->daemonServerRepository->expects('setServer->sync')->andReturnUndefined();

    app(BuildModificationService::class)->handle($server, [
        'remove_allocations' => [$allocation->id],
    ]);

    $this->assertDatabaseHas('allocations', ['id' => $allocation->id, 'server_id' => null]);
});

test('allocation in both add and remove is added', function () {
    $server = $this->createServerModel();
    /** @var Allocation $allocation */
    $allocation = Allocation::factory()->create(['node_id' => $server->node_id]);

    $this->daemonServerRepository->expects('setServer->sync')->andReturnUndefined();

    app(BuildModificationService::class)->handle($server, [
        'add_allocations' => [$allocation->id],
        'remove_allocations' => [$allocation->id],
    ]);

    $this->assertDatabaseHas('allocations', ['id' => $allocation->id, 'server_id' => $server->id]);
});

test('using same allocation id multiple times does not error', function () {
    $server = $this->createServerModel();
    /** @var Allocation $allocation */
    $allocation = Allocation::factory()->create(['node_id' => $server->node_id, 'server_id' => $server->id]);
    /** @var Allocation $allocation2 */
    $allocation2 = Allocation::factory()->create(['node_id' => $server->node_id]);

    $this->daemonServerRepository->expects('setServer->sync')->andReturnUndefined();

    app(BuildModificationService::class)->handle($server, [
        'add_allocations' => [$allocation2->id, $allocation2->id],
        'remove_allocations' => [$allocation->id, $allocation->id],
    ]);

    $this->assertDatabaseHas('allocations', ['id' => $allocation->id, 'server_id' => null]);
    $this->assertDatabaseHas('allocations', ['id' => $allocation2->id, 'server_id' => $server->id]);
});

test('updates are rolled back if exception is encountered', function () {
    $server = $this->createServerModel();
    /** @var Allocation $allocation */
    $allocation = Allocation::factory()->create(['node_id' => $server->node_id]);

    $this->daemonServerRepository->expects('setServer->sync')->andThrows(new DisplayException('Test'));

    $this->expectException(DisplayException::class);

    app(BuildModificationService::class)->handle($server, ['add_allocations' => [$allocation->id]]);
});
