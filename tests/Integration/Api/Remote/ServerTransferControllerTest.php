<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\Location;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Models\ServerTransfer;

beforeEach(function () {
    $server = $this->createServerModel();

    $new = Node::factory()
        ->for(Location::factory())
        ->has(Allocation::factory())
        ->create();

    $this->transfer = ServerTransfer::factory()->for($server)->create([
        'old_allocation' => $server->allocation_id,
        'new_allocation' => $new->allocations->first()->id,
        'new_node' => $new->id,
        'old_node' => $server->node_id,
    ]);
});

test('success status update can be sent from new node', function () {
    $server = $this->transfer->server;
    $newNode = $this->transfer->newNode;

    $this
        ->withHeader('Authorization', "Bearer $newNode->daemon_token_id." . $newNode->getDecryptedKey())
        ->postJson("/api/remote/servers/{$server->uuid}/transfer/success")
        ->assertNoContent();

    expect($this->transfer->refresh()->successful)->toBeTrue();
});

test('failure status update can be sent from old node', function () {
    $server = $this->transfer->server;
    $oldNode = $this->transfer->oldNode;

    $this
        ->withHeader('Authorization', "Bearer $oldNode->daemon_token_id." . $oldNode->getDecryptedKey())
        ->postJson("/api/remote/servers/{$server->uuid}/transfer/failure")
        ->assertNoContent();

    expect($this->transfer->refresh()->successful)->toBeFalse();
});

test('failure status update can be sent from new node', function () {
    $server = $this->transfer->server;
    $newNode = $this->transfer->newNode;

    $this
        ->withHeader('Authorization', "Bearer $newNode->daemon_token_id." . $newNode->getDecryptedKey())
        ->postJson("/api/remote/servers/{$server->uuid}/transfer/failure")
        ->assertNoContent();

    expect($this->transfer->refresh()->successful)->toBeFalse();
});

test('success status update cannot be sent from old node', function () {
    $server = $this->transfer->server;
    $oldNode = $this->transfer->oldNode;

    $this
        ->withHeader('Authorization', "Bearer $oldNode->daemon_token_id." . $oldNode->getDecryptedKey())
        ->postJson("/api/remote/servers/{$server->uuid}/transfer/success")
        ->assertForbidden()
        ->assertJsonPath('errors.0.code', 'HttpForbiddenException')
        ->assertJsonPath('errors.0.detail', 'Requesting node does not have permission to access this server.');

    expect($this->transfer->refresh()->successful)->toBeNull();
});

test('success status update cannot be sent from unauthorized node', function () {
    $server = $this->transfer->server;
    $node = Node::factory()->for(Location::factory())->create();

    $this
        ->withHeader('Authorization', "Bearer $node->daemon_token_id." . $node->getDecryptedKey())
        ->postJson("/api/remote/servers/$server->uuid/transfer/success")
        ->assertForbidden()
        ->assertJsonPath('errors.0.code', 'HttpForbiddenException')
        ->assertJsonPath('errors.0.detail', 'Requesting node does not have permission to access this server.');

    expect($this->transfer->refresh()->successful)->toBeNull();
});

test('failure status update cannot be sent from unauthorized node', function () {
    $server = $this->transfer->server;
    $node = Node::factory()->for(Location::factory())->create();

    $this
        ->withHeader('Authorization', "Bearer $node->daemon_token_id." . $node->getDecryptedKey())
        ->postJson("/api/remote/servers/$server->uuid/transfer/failure")->assertForbidden()
        ->assertJsonPath('errors.0.code', 'HttpForbiddenException')
        ->assertJsonPath('errors.0.detail', 'Requesting node does not have permission to access this server.');

    expect($this->transfer->refresh()->successful)->toBeNull();
});
