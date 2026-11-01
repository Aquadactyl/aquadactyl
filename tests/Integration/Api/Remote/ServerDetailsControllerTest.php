<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\Backup;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Location;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Models\ServerTransfer;
use Pterodactyl\Services\Eggs\EggConfigurationService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Servers\ServerConfigurationStructureService;

uses(DatabaseTransactions::class);

beforeEach(function () {
    $this->server = $this->createServerModel();
    $this->node = $this->server->node;
    $this->withHeader('Authorization', 'Bearer ' . $this->node->daemon_token_id . '.' . $this->node->getDecryptedKey());
    $this->configuration = Mockery::mock(ServerConfigurationStructureService::class);
    $this->eggConfiguration = Mockery::mock(EggConfigurationService::class);
    $this->app->instance(ServerConfigurationStructureService::class, $this->configuration);
    $this->app->instance(EggConfigurationService::class, $this->eggConfiguration);
});

test('Wings can recover only servers assigned to its authenticated node', function (bool $authorized) {
    if (!$authorized) {
        $otherNode = Node::factory()->for(Location::factory())->create();
        $this->withHeader('Authorization', 'Bearer ' . $otherNode->daemon_token_id . '.' . $otherNode->getDecryptedKey());
        $this->configuration->shouldNotReceive('handle');
        $this->eggConfiguration->shouldNotReceive('handle');
        $this->getJson('/api/remote/servers/' . $this->server->uuid)->assertForbidden();

        return;
    }
    $this->configuration->shouldReceive('handle')->once()->with(Mockery::on(fn ($server) => $server->id === $this->server->id))->andReturn(['uuid' => $this->server->uuid]);
    $this->eggConfiguration->shouldReceive('handle')->once()->andReturn(['stop' => 'stop']);
    $this->getJson('/api/remote/servers/' . $this->server->uuid)->assertOk()
        ->assertExactJson(['settings' => ['uuid' => $this->server->uuid], 'process_configuration' => ['stop' => 'stop']]);
})->with([true, false]);

test('Wings server transfers authorize the source and destination but deny other nodes', function (string $role) {
    $newNode = Node::factory()->for(Location::factory())->has(Allocation::factory())->create();
    ServerTransfer::factory()->for($this->server)->create([
        'old_node' => $this->node->id, 'new_node' => $newNode->id,
        'old_allocation' => $this->server->allocation_id, 'new_allocation' => $newNode->allocations->first()->id,
    ]);
    $node = match ($role) {
        'source' => $this->node,
        'destination' => $newNode,
        default => Node::factory()->for(Location::factory())->create(),
    };
    $this->withHeader('Authorization', 'Bearer ' . $node->daemon_token_id . '.' . $node->getDecryptedKey());
    if ($role === 'unrelated') {
        $this->getJson('/api/remote/servers/' . $this->server->uuid)->assertForbidden();

        return;
    }
    $this->configuration->shouldReceive('handle')->once()->andReturn(['uuid' => $this->server->uuid]);
    $this->eggConfiguration->shouldReceive('handle')->once()->andReturn([]);
    $this->getJson('/api/remote/servers/' . $this->server->uuid)->assertOk()->assertJsonPath('settings.uuid', $this->server->uuid);
})->with(['source', 'destination', 'unrelated']);

test('Wings configuration pagination returns integer limits and excludes other nodes', function () {
    $this->createServerModel();
    $this->configuration->shouldReceive('handle')->once()->andReturn(['uuid' => $this->server->uuid]);
    $this->eggConfiguration->shouldReceive('handle')->once()->andReturn([]);
    $this->getJson('/api/remote/servers?per_page=1')->assertOk()
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.uuid', $this->server->uuid)
        ->assertJsonPath('meta.per_page', 1)->assertJsonPath('meta.total', 1);
});

test('Wings restart resets interrupted installs and restores only on its own node', function () {
    $this->server->update(['status' => Server::STATUS_RESTORING_BACKUP]);
    $backup = Backup::factory()->create(['server_id' => $this->server->id, 'name' => 'Interrupted backup']);
    Activity::event('server:backup.restore-started')->subject($this->server, $backup)->log();
    $installing = $this->createServerModel(['node_id' => $this->node->id, 'status' => Server::STATUS_INSTALLING]);
    $noActivity = $this->createServerModel(['node_id' => $this->node->id, 'status' => Server::STATUS_RESTORING_BACKUP]);
    $noBackup = $this->createServerModel(['node_id' => $this->node->id, 'status' => Server::STATUS_RESTORING_BACKUP]);
    Activity::event('server:backup.restore-started')->subject($noBackup)->log();
    $suspended = $this->createServerModel(['node_id' => $this->node->id, 'status' => Server::STATUS_SUSPENDED]);
    $otherNode = $this->createServerModel(['status' => Server::STATUS_INSTALLING]);

    $this->postJson('/api/remote/servers/reset')->assertNoContent();
    foreach ([$this->server, $installing, $noActivity, $noBackup] as $server) {
        expect($server->refresh()->status)->toBeNull();
    }
    expect($suspended->refresh()->status)->toBe(Server::STATUS_SUSPENDED)
        ->and($otherNode->refresh()->status)->toBe(Server::STATUS_INSTALLING);
    $this->assertDatabaseHas('activity_logs', ['event' => 'server:backup.restore-failed']);
});
