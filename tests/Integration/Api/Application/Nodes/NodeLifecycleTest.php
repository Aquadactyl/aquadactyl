<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\Location;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;

test('application clients can create find update and delete a node', function () {
    $location = Location::factory()->create();
    $payload = ['name' => 'Application lifecycle node', 'location_id' => $location->id, 'fqdn' => '127.0.0.1', 'scheme' => 'http', 'memory' => 2048, 'memory_overallocate' => 0, 'disk' => 4096, 'disk_overallocate' => 0, 'upload_size' => 100, 'daemon_listen' => 8080, 'daemon_sftp' => 2022];
    $response = $this->postJson('/api/application/nodes', $payload)->assertCreated()->assertJsonPath('attributes.name', $payload['name']);
    $id = $response->json('attributes.id');
    $node = Node::findOrFail($id);
    expect($node->daemon_token)->not->toBeEmpty();
    $this->getJson('/api/application/nodes?filter[name]=Application lifecycle&sort=-memory&per_page=1')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.attributes.id', $id);
    $this->getJson('/api/application/nodes/' . $id)->assertOk()->assertJsonPath('attributes.id', $id);
    $this->mock(DaemonConfigurationRepository::class)->shouldReceive('setNode')->once()->andReturnSelf()->shouldReceive('update')->once();
    $this->patchJson('/api/application/nodes/' . $id, array_replace($payload, ['name' => 'Renamed node', 'reset_secret' => true]))->assertOk()->assertJsonPath('attributes.name', 'Renamed node');
    expect($node->fresh()->daemon_token_id)->not->toBe($node->daemon_token_id);
    $this->deleteJson('/api/application/nodes/' . $id)->assertNoContent();
    $this->assertDatabaseMissing('nodes', ['id' => $id]);
});

test('new nodes default to two gibibytes and preserve explicitly configured upload limits', function (?int $limit) {
    $location = Location::factory()->create();
    $payload = ['name' => 'Upload test node', 'location_id' => $location->id, 'fqdn' => '127.0.0.1', 'scheme' => 'http', 'memory' => 2048, 'memory_overallocate' => 0, 'disk' => 4096, 'disk_overallocate' => 0, 'daemon_listen' => 8080, 'daemon_sftp' => 2022];
    if ($limit !== null) {
        $payload['upload_size'] = $limit;
    }
    $response = $this->postJson('/api/application/nodes', $payload)->assertCreated()
        ->assertJsonPath('attributes.upload_size', $limit ?? 2048);
    $node = Node::findOrFail($response->json('attributes.id'));
    expect($node->getConfiguration()['api']['upload_limit'])->toBe($limit ?? 2048);
})->with(['default limit' => [null], 'custom limit' => [4096]]);

test('allocation creation list filtering and removal remain scoped to their node', function () {
    $server = $this->createServerModel();
    $base = '/api/application/nodes/' . $server->node_id . '/allocations';
    $this->postJson($base, ['ip' => '192.0.2.10', 'alias' => 'game.example.test', 'ports' => ['26000-26001']])->assertNoContent();
    $free = Allocation::where('node_id', $server->node_id)->whereNull('server_id')->firstOrFail();
    $this->getJson($base . '?filter[server_id]=' . $server->id)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.attributes.assigned', true);
    foreach (['false', 'not-a-number', '0'] as $value) {
        $this->getJson($base . '?filter[server_id]=' . $value)->assertOk()->assertJsonCount(2, 'data');
    }
    $this->getJson($base . '?filter[ip]=192.0.2.10&filter[port]=26000&filter[ip_alias]=game&per_page=1')->assertOk()->assertJsonCount(1, 'data');
    $this->deleteJson($base . '/' . $free->id)->assertNoContent();
    $this->assertDatabaseMissing('allocations', ['id' => $free->id]);
});

test('deployable node searches honor locations capacity and input validation', function () {
    $node = Node::factory()->for(Location::factory())->create(['public' => true, 'memory' => 2048, 'disk' => 4096, 'memory_overallocate' => 0, 'disk_overallocate' => 0]);
    $this->getJson('/api/application/nodes/deployable?memory=512&disk=1024&location_ids[]=' . $node->location_id)->assertOk()->assertJsonPath('data.0.attributes.id', $node->id);
    $this->getJson('/api/application/nodes/deployable?memory=0&disk=0')->assertOk();
    $response = $this->getJson('/api/application/nodes/deployable?memory=-1')->assertUnprocessable();
    expect(array_column(array_column($response->json('errors'), 'meta'), 'source_field'))->toContain('memory', 'disk');
});

test('read-only node credentials cannot create nodes', function () {
    $this->createNewDefaultApiKey($this->getApiUser(), ['r_nodes' => 1, 'r_allocations' => 1]);
    $this->postJson('/api/application/nodes', [])->assertForbidden();
});

test('read-only allocation credentials cannot create allocations', function () {
    $node = Node::factory()->for(Location::factory())->create();
    $this->createNewDefaultApiKey($this->getApiUser(), ['r_allocations' => 1]);
    $this->postJson('/api/application/nodes/' . $node->id . '/allocations', [])->assertForbidden();
});
