<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\Location;
use Illuminate\Support\Facades\DB;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Repositories\Eloquent\NodeRepository;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Repositories\Eloquent\ServerRepository;
use Pterodactyl\Repositories\Eloquent\LocationRepository;
use Pterodactyl\Exceptions\Repository\RecordNotFoundException;

uses(DatabaseTransactions::class);

test('server bulk operation repositories respect the requested server and node filters', function (string $method, string $selection) {
    $selected = $this->createServerModel();
    $other = $this->createServerModel();
    $repository = app(ServerRepository::class);
    $servers = $repository->{$method}($selection === 'server' ? $selected->id : null, $selection === 'node' ? $selected->node_id : null);
    expect($servers->pluck('id')->sort()->values()->all())->toBe($selection === 'all' ? [$selected->id, $other->id] : [$selected->id]);
    foreach ($servers as $server) {
        expect($server->relationLoaded('allocation'))->toBeTrue()->and($server->relationLoaded('egg'))->toBeTrue()->and($server->relationLoaded('node'))->toBeTrue();
    }
})->with(['getDataForRebuild', 'getDataForReinstall'])->with(['all', 'server', 'node']);

test('server repository refresh options replace stale relations and preserve model identity', function (bool $refresh) {
    $server = $this->createServerModel();
    $repository = app(ServerRepository::class);
    $server->unsetRelations();
    expect($repository->loadEggRelations($server, $refresh))->toBe($server)
        ->and($server->egg->relationLoaded('scriptFrom'))->toBeTrue()
        ->and($repository->getPrimaryAllocation($server, $refresh))->toBe($server)
        ->and($server->allocation->server_id)->toBe($server->id)
        ->and($repository->getDataForCreation($server, $refresh))->toBe($server)
        ->and($server->relationLoaded('allocations'))->toBeTrue()
        ->and($repository->loadDatabaseRelations($server, $refresh))->toBe($server)
        ->and($server->databases)->toHaveCount(0)
        ->and($repository->getDaemonServiceData($server, $refresh))->toBe(['egg' => $server->egg->uuid]);
    $found = $repository->findWithVariables($server->id);
    expect($found->relationLoaded('variables'))->toBeTrue()->and($found->egg->relationLoaded('variables'))->toBeTrue();
    expect($repository->isUniqueUuidCombo($server->uuid))->toBeFalse()->and($repository->isUniqueUuid('missing'))->toBeTrue();
})->with([true, false]);

test('server repository lookups report missing models consistently', function (string $method) {
    expect(fn () => app(ServerRepository::class)->{$method}($method === 'getByUuid' ? 'missing' : 2147483647))->toThrow(RecordNotFoundException::class);
})->with(['findWithVariables', 'getByUuid']);

test('node usage statistics account for over-allocation and classify resource utilization', function (int $memory, string $color) {
    $location = Location::factory()->create();
    $node = Node::factory()->create(['location_id' => $location->id, 'memory' => 1000, 'disk' => 2000, 'memory_overallocate' => 100, 'disk_overallocate' => 0]);
    $this->createServerModel(['node_id' => $node->id, 'memory' => $memory, 'disk' => 500]);
    $repository = app(NodeRepository::class);
    $stats = $repository->getUsageStats($node);
    expect($stats['memory'])->toMatchArray(['max' => '2,000', 'css' => $color, 'percent' => $memory / 20])
        ->and($stats['disk']['max'])->toBe('2,000');
    $raw = $repository->getUsageStatsRaw($node);
    expect((int) $raw['memory']['value'])->toBe($memory)->and((int) $raw['memory']['max'])->toBe(2000);
    $loaded = $repository->getNodeWithResourceUsage($node->id);
    expect((int) $loaded->sum_memory)->toBe($memory)->and((int) $loaded->sum_disk)->toBe(500);
})->with([[200, 'green'], [1600, 'yellow'], [1900, 'red']]);

test('server-creation node choices expose only unassigned allocations', function () {
    $server = $this->createServerModel();
    $free = Allocation::factory()->create(['node_id' => $server->node_id]);
    $nodes = app(NodeRepository::class)->getNodesForServerCreation();
    $selected = $nodes->firstWhere('id', $server->node_id);
    expect($selected['allocations']->all())->toBe([['id' => $free->id, 'text' => $free->ip . ':' . $free->port]]);
});

test('base repositories persist unvalidated values and support updates insertion expressions and deletion', function () {
    $repository = app(LocationRepository::class)->withFreshModel();
    $created = $repository->create(['short' => 'coverage', 'long' => null], false);
    expect($created)->toBeInstanceOf(Location::class);
    $updated = $repository->update($created->id, ['long' => 'Changed'], false);
    expect($updated->long)->toBe('Changed');
    expect($repository->updateWhere(['id' => $created->id], ['long' => 'Where update']))->toBe(1);
    expect($repository->find($created->id)->long)->toBe('Where update');
    expect($repository->updateWhereIn('id', [$created->id], ['long' => 'List update']))->toBe(1);
    expect($repository->insertIgnore([]))->toBeTrue();
    expect($repository->insertIgnore([['short' => 'expression', 'long' => DB::raw("'Expression insert'")]]))->toBeTrue();
    expect(Location::query()->where('short', 'expression')->firstOrFail()->long)->toBe('Expression insert');
    expect($repository->paginated(1)->perPage())->toBe(1);
    expect($repository->count())->toBeGreaterThanOrEqual(2);
    expect($repository->delete($created->id, true))->toBe(1);
    expect(fn () => $repository->update($created->id, ['long' => 'Missing']))->toThrow(RecordNotFoundException::class);
});

test('repository update-or-create reuses the matching model and rejects non-scalar selectors', function () {
    $repository = app(LocationRepository::class)->withFreshModel();
    $first = $repository->updateOrCreate(['short' => 'upsert-test'], ['long' => 'Original']);
    $second = $repository->updateOrCreate(['short' => 'upsert-test'], ['long' => 'Updated']);
    expect($second->id)->toBe($first->id)->and($second->long)->toBe('Updated');
    expect(fn () => $repository->updateOrCreate(['short' => []], []))->toThrow(InvalidArgumentException::class);
});

test('legacy repository pagination respects request filters only when explicitly enabled', function () {
    $repository = new class(app()) extends LocationRepository {
        public function page(): Illuminate\Contracts\Pagination\LengthAwarePaginator
        {
            return $this->paginate($this->getBuilder(), 5);
        }

        public function initialize(string ...$args): mixed
        {
            return $this->initializeModel(...$args);
        }

        public function baseModel(): Illuminate\Database\Eloquent\Model
        {
            return parent::getModel();
        }
    };
    app()->instance(Illuminate\Http\Request::class, Illuminate\Http\Request::create('/', 'GET', ['per_page' => 2]));
    expect($repository->page()->perPage())->toBe(5)->and($repository->usingRequestFilters()->page()->perPage())->toBe(2);
    expect($repository->baseModel())->toBeInstanceOf(Location::class);
    expect(fn () => $repository->find(PHP_INT_MAX))->toThrow(RecordNotFoundException::class);
    expect(fn () => $repository->initialize())->toThrow(InvalidArgumentException::class);
    $factory = new class {
        public function make(): Location
        {
            return new Location();
        }
    };
    app()->instance('coverage.location-factory', $factory);
    expect($repository->initialize('coverage.location-factory', 'make'))->toBeInstanceOf(Location::class);
});

test('repositories surface model event vetoes without creating or updating records', function () {
    $location = Location::factory()->create(['short' => 'allowed-repository-location']);
    $dispatcher = Location::getEventDispatcher();
    Location::setEventDispatcher(new Illuminate\Events\Dispatcher(app()));
    Location::saving(fn ($model) => $model->short !== 'blocked-repository-location');
    try {
        $repository = app(LocationRepository::class);
        expect(fn () => $repository->create(['short' => 'blocked-repository-location']))->toThrow(Pterodactyl\Exceptions\Model\DataValidationException::class);
        expect(fn () => $repository->update($location->id, ['short' => 'blocked-repository-location']))->toThrow(Pterodactyl\Exceptions\Model\DataValidationException::class);
        expect($location->fresh()->short)->toBe('allowed-repository-location');
        $this->assertDatabaseMissing('locations', ['short' => 'blocked-repository-location']);
    } finally {
        Location::setEventDispatcher($dispatcher);
    }
});
