<?php

use Pterodactyl\Models\Server;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Models\Objects\DeploymentObject;
use Pterodactyl\Services\Servers\ServerCreationService;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;

test('application server listing and external lookup return the intended resource', function () {
    $server = $this->createServerModel(['external_id' => 'coverage-application-server', 'name' => 'Coverage API server']);
    $this->getJson('/api/application/servers?filter[name]=Coverage API&sort=-id&per_page=1')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.attributes.id', $server->id);
    $this->getJson('/api/application/servers/external/' . $server->external_id)->assertOk()->assertJsonPath('attributes.id', $server->id);
});

test('application server creation maps explicit allocations and automatic deployment criteria', function (bool $automatic) {
    $server = $this->createServerModel();
    $payload = ['name' => 'Coverage created server', 'user' => $server->owner_id, 'egg' => $server->egg_id, 'docker_image' => $server->image, 'startup' => $server->startup, 'environment' => [], 'limits' => ['memory' => 256, 'swap' => 0, 'disk' => 1024, 'io' => 500, 'cpu' => 0], 'feature_limits' => ['databases' => 1, 'backups' => 1]];
    if ($automatic) {
        $payload['deploy'] = ['locations' => [$server->node->location_id], 'port_range' => ['25000-26000'], 'dedicated_ip' => true];
    } else {
        $payload['allocation'] = ['default' => Allocation::factory()->create(['node_id' => $server->node_id])->id];
    }
    $this->mock(ServerCreationService::class)->shouldReceive('handle')->once()->with(Mockery::on(fn ($data) => $data['name'] === $payload['name'] && $data['owner_id'] === $server->owner_id), Mockery::on(fn ($deployment) => $automatic ? $deployment instanceof DeploymentObject && $deployment->isDedicated() && $deployment->getLocations() === [$server->node->location_id] && $deployment->getPorts() === ['25000-26000'] : $deployment === null))->andReturn($server);
    $this->postJson('/api/application/servers', $payload)->assertCreated()->assertJsonPath('attributes.id', $server->id);
})->with([true, false]);

test('application server suspension and reinstatement synchronize Wings and update status', function () {
    $server = $this->createServerModel();
    $daemon = $this->mock(DaemonServerRepository::class);
    $daemon->shouldReceive('setServer')->twice()->andReturnSelf()->shouldReceive('sync')->twice();
    $this->postJson('/api/application/servers/' . $server->id . '/suspend')->assertNoContent();
    expect($server->fresh()->status)->toBe(Server::STATUS_SUSPENDED);
    $this->postJson('/api/application/servers/' . $server->id . '/unsuspend')->assertNoContent();
    expect($server->fresh()->status)->toBeNull();
});

test('application deletion removes the server and frees its allocation', function () {
    $server = $this->createServerModel();
    $this->mock(DaemonServerRepository::class)->shouldReceive('setServer')->once()->andReturnSelf()->shouldReceive('delete')->once();
    $this->deleteJson('/api/application/servers/' . $server->id . '/force')->assertNoContent();
    $this->assertDatabaseMissing('servers', ['id' => $server->id]);
    expect($server->allocation->fresh()->server_id)->toBeNull();
});
