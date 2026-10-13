<?php

use Pterodactyl\Models\Allocation;
use Pterodactyl\Services\Servers\ServerCreationService;

beforeEach(function () {
    $this->fixtureServer = $this->createServerModel();
    $allocation = Allocation::factory()->create(['node_id' => $this->fixtureServer->node_id, 'server_id' => null]);
    $this->serverPayload = [
        'name' => 'API created server', 'user' => $this->fixtureServer->owner_id,
        'egg' => $this->fixtureServer->egg_id, 'docker_image' => 'ghcr.io/pterodactyl/yolks:java_25',
        'startup' => 'java -jar server.jar', 'environment' => [],
        'limits' => ['memory' => 1024, 'swap' => 0, 'disk' => 2048, 'io' => 500, 'cpu' => 100],
        'feature_limits' => ['databases' => 1, 'allocations' => 2, 'backups' => 3],
        'allocation' => ['default' => $allocation->id, 'additional' => []],
    ];
});

test('application server creation normalizes the API payload before creating a server', function () {
    $service = Mockery::mock(ServerCreationService::class);
    $service->shouldReceive('handle')->once()->with(Mockery::on(function ($data) {
        expect($data['owner_id'])->toBe($this->fixtureServer->owner_id)
            ->and($data['egg_id'])->toBe($this->fixtureServer->egg_id)
            ->and($data['memory'])->toBe(1024)
            ->and($data['database_limit'])->toBe(1)
            ->and($data['skip_scripts'])->toBeFalse()
            ->and($data['start_on_completion'])->toBeFalse()
            ->and($data['allocation_id'])->toBe($this->serverPayload['allocation']['default']);

        return true;
    }), null)->andReturn($this->fixtureServer);
    $this->app->instance(ServerCreationService::class, $service);
    $this->postJson('/api/application/servers', $this->serverPayload)->assertCreated()
        ->assertJsonPath('attributes.uuid', $this->fixtureServer->uuid);
});

test('application server creation rejects unavailable allocations and invalid resource limits', function (string $field, mixed $value) {
    $service = Mockery::mock(ServerCreationService::class);
    $service->shouldNotReceive('handle');
    $this->app->instance(ServerCreationService::class, $service);
    data_set($this->serverPayload, $field, $value === 'assigned-allocation' ? $this->fixtureServer->allocation_id : $value);
    $this->postJson('/api/application/servers', $this->serverPayload)->assertUnprocessable();
})->with([
    ['allocation.default', 'assigned-allocation'],
    ['allocation.additional', [99999999]],
    ['limits.memory', -1], ['limits.disk', -1], ['limits.io', 1001],
    ['feature_limits.backups', -1], ['environment', 'invalid'], ['name', ''],
]);
