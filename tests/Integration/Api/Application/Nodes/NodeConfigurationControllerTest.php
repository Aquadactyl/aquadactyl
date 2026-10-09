<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\Location;
use Pterodactyl\Services\Acl\Api\AdminAcl;

test('write node key can get node configuration', function () {
    $this->createNewDefaultApiKey($this->getApiUser(), ['r_nodes' => AdminAcl::READ | AdminAcl::WRITE]);

    $node = Node::factory()->for(Location::factory())->create();

    $response = $this->getJson('/api/application/nodes/' . $node->id . '/configuration');

    $response->assertOk();
    $response->assertJsonPath('uuid', $node->uuid);
    $response->assertJsonPath('token_id', $node->daemon_token_id);
    expect($response->json('token'))->toBe(decrypt($node->daemon_token));
});

test('read only node key cannot get node configuration', function () {
    $this->createNewDefaultApiKey($this->getApiUser(), ['r_nodes' => AdminAcl::READ]);

    $node = Node::factory()->for(Location::factory())->create();

    $this->assertAccessDeniedJson($this->getJson('/api/application/nodes/' . $node->id . '/configuration'));
});
