<?php

use Pterodactyl\Models\Allocation;
use Pterodactyl\Exceptions\DisplayException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Repositories\Eloquent\AllocationRepository;
use Pterodactyl\Services\Deployment\AllocationSelectionService;
use Pterodactyl\Exceptions\Service\Deployment\NoViableAllocationException;

uses(DatabaseTransactions::class);

test('dedicated allocation selection excludes IPs already shared with a server', function () {
    $server = $this->createServerModel();
    $shared = Allocation::factory()->create(['node_id' => $server->node_id, 'ip' => $server->allocation->ip, 'port' => 31000]);
    $dedicated = Allocation::factory()->create(['node_id' => $server->node_id, 'ip' => '192.0.2.25', 'port' => 31001]);
    $selection = app(AllocationSelectionService::class)->setNodes([$server->node_id])->setDedicated(true)->setPorts(['31000-31001']);
    expect($selection->handle()->id)->toBe($dedicated->id);
    expect(app(AllocationRepository::class)->getRandomAllocation([$server->node_id], [31000], false)->id)->toBe($shared->id);
});

test('allocation selection can combine individual ports with ranges and refuses unavailable candidates', function () {
    $server = $this->createServerModel();
    $free = Allocation::factory()->create(['node_id' => $server->node_id, 'port' => 32000]);
    $selection = app(AllocationSelectionService::class)->setNodes([$server->node_id])->setPorts(['32000', '32010-32012']);
    expect($selection->handle()->id)->toBe($free->id);
    expect(fn () => $selection->setPorts(['32500'])->handle())->toThrow(NoViableAllocationException::class);
    expect(fn () => $selection->setPorts(['2000-4000']))->toThrow(DisplayException::class);
});

test('dedicated allocation lookup can search every node while rejecting globally shared addresses', function () {
    $server = $this->createServerModel();
    Allocation::factory()->create(['node_id' => $server->node_id, 'ip' => $server->allocation->ip, 'port' => 39999]);
    expect(app(AllocationRepository::class)->getRandomAllocation([], [39999], true))->toBeNull();
});
