<?php

use Pterodactyl\Models\Allocation;
use Pterodactyl\Services\Allocations\FindAssignableAllocationService;
use Pterodactyl\Exceptions\Service\Allocation\AutoAllocationNotEnabledException;
use Pterodactyl\Exceptions\Service\Allocation\NoAutoAllocationSpaceAvailableException;

beforeEach(function () {
    config()->set('pterodactyl.client_features.allocations.enabled', true);
    config()->set('pterodactyl.client_features.allocations.range_start', 0);
    config()->set('pterodactyl.client_features.allocations.range_end', 0);
});

test('existing allocation is preferred', function () {
    $server = $this->createServerModel();

    $created = Allocation::factory()->create([
        'node_id' => $server->node_id,
        'ip' => $server->allocation->ip,
    ]);

    $response = app(FindAssignableAllocationService::class)->handle($server);

    expect($response->id)->toBe($created->id)
        ->and($response->ip)->toBe($server->allocation->ip)
        ->and($response->node_id)->toBe($server->node_id)
        ->and($response->server_id)->toBe($server->id)
        ->and($response->id)->not->toBe($server->allocation_id);
});

test('new allocation is created if one is not found', function () {
    $server = $this->createServerModel();
    config()->set('pterodactyl.client_features.allocations.range_start', 5000);
    config()->set('pterodactyl.client_features.allocations.range_end', 5005);

    $response = app(FindAssignableAllocationService::class)->handle($server);

    expect($response->server_id)->toBe($server->id)
        ->and($response->ip)->toBe($server->allocation->ip)
        ->and($response->node_id)->toBe($server->node_id)
        ->and($response->id)->not->toBe($server->allocation_id)
        ->and($response->port)->toBeGreaterThanOrEqual(5000)
        ->and($response->port)->toBeLessThanOrEqual(5005);
});

test('only port not in use is created', function () {
    $server = $this->createServerModel();
    $server2 = $this->createServerModel(['node_id' => $server->node_id]);

    config()->set('pterodactyl.client_features.allocations.range_start', 5000);
    config()->set('pterodactyl.client_features.allocations.range_end', 5001);

    Allocation::factory()->create([
        'server_id' => $server2->id,
        'node_id' => $server->node_id,
        'ip' => $server->allocation->ip,
        'port' => 5000,
    ]);

    $response = app(FindAssignableAllocationService::class)->handle($server);
    expect($response->port)->toBe(5001);
});

test('exception is thrown if no more allocations can be created in range', function () {
    $server = $this->createServerModel();
    $server2 = $this->createServerModel(['node_id' => $server->node_id]);
    config()->set('pterodactyl.client_features.allocations.range_start', 5000);
    config()->set('pterodactyl.client_features.allocations.range_end', 5005);

    for ($i = 5000; $i <= 5005; ++$i) {
        Allocation::factory()->create([
            'ip' => $server->allocation->ip,
            'port' => $i,
            'node_id' => $server->node_id,
            'server_id' => $server2->id,
        ]);
    }

    $this->expectException(NoAutoAllocationSpaceAvailableException::class);
    $this->expectExceptionMessage('Cannot assign additional allocation: no more space available on node.');

    app(FindAssignableAllocationService::class)->handle($server);
});

test('exception is thrown if only free port is on a different ip', function () {
    $server = $this->createServerModel();

    Allocation::factory()->times(5)->create(['node_id' => $server->node_id]);

    $this->expectException(NoAutoAllocationSpaceAvailableException::class);
    $this->expectExceptionMessage('Cannot assign additional allocation: no more space available on node.');

    app(FindAssignableAllocationService::class)->handle($server);
});

test('exception is thrown if start or end range is not defined', function () {
    $server = $this->createServerModel();

    $this->expectException(NoAutoAllocationSpaceAvailableException::class);
    $this->expectExceptionMessage('Cannot assign additional allocation: no more space available on node.');

    app(FindAssignableAllocationService::class)->handle($server);
});

test('exception is thrown if start or end range is not numeric', function () {
    $server = $this->createServerModel();
    config()->set('pterodactyl.client_features.allocations.range_start', 'hodor');
    config()->set('pterodactyl.client_features.allocations.range_end', 10);

    try {
        app(FindAssignableAllocationService::class)->handle($server);
        $this->fail('This assertion should not be reached.');
    } catch (Exception $exception) {
        expect($exception)->toBeInstanceOf(InvalidArgumentException::class)
            ->and($exception->getMessage())->toBe('Expected an integerish value. Got: string');
    }

    config()->set('pterodactyl.client_features.allocations.range_start', 10);
    config()->set('pterodactyl.client_features.allocations.range_end', 'hodor');

    try {
        app(FindAssignableAllocationService::class)->handle($server);
        $this->fail('This assertion should not be reached.');
    } catch (Exception $exception) {
        expect($exception)->toBeInstanceOf(InvalidArgumentException::class)
            ->and($exception->getMessage())->toBe('Expected an integerish value. Got: string');
    }
});

test('exception is thrown if feature is not enabled', function () {
    config()->set('pterodactyl.client_features.allocations.enabled', false);
    $server = $this->createServerModel();

    $this->expectException(AutoAllocationNotEnabledException::class);

    app(FindAssignableAllocationService::class)->handle($server);
});
