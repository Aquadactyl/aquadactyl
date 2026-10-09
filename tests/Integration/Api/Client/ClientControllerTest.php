<?php

use Ramsey\Uuid\Uuid;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Subuser;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Models\Permission;

test('only logged in users servers are returned', function () {
    /** @var \Pterodactyl\Models\User[] $users */
    $users = User::factory()->times(3)->create();

    /** @var \Pterodactyl\Models\Server[] $servers */
    $servers = [
        $this->createServerModel(['user_id' => $users[0]->id]),
        $this->createServerModel(['user_id' => $users[1]->id]),
        $this->createServerModel(['user_id' => $users[2]->id]),
    ];

    $response = $this->actingAs($users[0])->getJson('/api/client');

    $response->assertOk();
    $response->assertJsonPath('object', 'list');
    $response->assertJsonPath('data.0.object', Server::RESOURCE_NAME);
    $response->assertJsonPath('data.0.attributes.identifier', $servers[0]->identifier);
    $response->assertJsonPath('data.0.attributes.server_owner', true);
    $response->assertJsonPath('meta.pagination.total', 1);
    $response->assertJsonPath('meta.pagination.per_page', 50);
});

test('servers are filtered using name and uuid information', function () {
    /** @var \Pterodactyl\Models\User[] $users */
    $users = User::factory()->times(2)->create();
    $users[0]->update(['root_admin' => true]);

    /** @var \Pterodactyl\Models\Server[] $servers */
    $servers = [
        $this->createServerModel(['user_id' => $users[0]->id, 'name' => 'Julia']),
        $this->createServerModel(['user_id' => $users[1]->id, 'name' => 'Janice']),
        $this->createServerModel(['user_id' => $users[1]->id, 'uuid' => Uuid::uuid4()->toString(), 'external_id' => 'ext123', 'name' => 'Julia']),
        $this->createServerModel(['user_id' => $users[1]->id, 'uuid' => Uuid::uuid4()->toString(), 'name' => 'Jennifer']),
    ];

    $this->actingAs($users[1])->getJson('/api/client?filter[*]=Julia')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.attributes.identifier', $servers[2]->identifier);

    $this->actingAs($users[1])->getJson('/api/client?filter[*]=ext123')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.attributes.identifier', $servers[2]->identifier);

    $this->actingAs($users[1])->getJson('/api/client?filter[*]=ext123')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.attributes.identifier', $servers[2]->identifier);

    $this->actingAs($users[1])->getJson("/api/client?filter[*]={$servers[1]->identifier}")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.attributes.identifier', $servers[1]->identifier);

    $this->actingAs($users[1])->getJson("/api/client?filter[*]={$servers[2]->identifier}")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.attributes.identifier', $servers[2]->identifier);

    $this->actingAs($users[1])->getJson('/api/client?filter[*]=88788878-abcd')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    $this->actingAs($users[0])->getJson('/api/client?filter[*]=Julia&type=admin-all')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.attributes.identifier', $servers[0]->identifier)
        ->assertJsonPath('data.1.attributes.identifier', $servers[2]->identifier);
});

test('servers are filtered using allocation information', function () {
    /** @var User $user */
    /** @var Server $server */
    [$user, $server] = $this->generateTestAccount();
    $server2 = $this->createServerModel(['user_id' => $user->id, 'node_id' => $server->node_id]);

    $allocation = Allocation::factory()->create(['node_id' => $server->node_id, 'server_id' => $server->id, 'ip' => '192.168.1.1', 'port' => 25565]);
    $allocation2 = Allocation::factory()->create(['node_id' => $server->node_id, 'server_id' => $server2->id, 'ip' => '192.168.1.1', 'port' => 25570]);

    $server->update(['allocation_id' => $allocation->id]);
    $server2->update(['allocation_id' => $allocation2->id]);

    $server->refresh();
    $server2->refresh();

    $this->actingAs($user)->getJson('/api/client?filter[*]=192.168.1.1')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.attributes.identifier', $server->identifier)
        ->assertJsonPath('data.1.attributes.identifier', $server2->identifier);

    $this->actingAs($user)->getJson('/api/client?filter[*]=192.168.1.1:25565')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.attributes.identifier', $server->identifier);

    $this->actingAs($user)->getJson('/api/client?filter[*]=:25570')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.attributes.identifier', $server2->identifier);

    $this->actingAs($user)->getJson('/api/client?filter[*]=:255')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.attributes.identifier', $server->identifier)
        ->assertJsonPath('data.1.attributes.identifier', $server2->identifier);
});

test('servers user is a subuser of are returned', function () {
    /** @var \Pterodactyl\Models\User[] $users */
    $users = User::factory()->times(3)->create();
    $servers = [
        $this->createServerModel(['user_id' => $users[0]->id]),
        $this->createServerModel(['user_id' => $users[1]->id]),
        $this->createServerModel(['user_id' => $users[2]->id]),
    ];

    // Set user 0 as a subuser of server 1. Thus, we should get two servers
    // back in the response when making the API call as user 0.
    Subuser::query()->create([
        'user_id' => $users[0]->id,
        'server_id' => $servers[1]->id,
        'permissions' => [Permission::ACTION_WEBSOCKET_CONNECT],
    ]);

    $response = $this->actingAs($users[0])->getJson('/api/client');

    $response->assertOk();
    $response->assertJsonCount(2, 'data');
    $response->assertJsonPath('data.0.attributes.server_owner', true);
    $response->assertJsonPath('data.0.attributes.identifier', $servers[0]->identifier);
    $response->assertJsonPath('data.1.attributes.server_owner', false);
    $response->assertJsonPath('data.1.attributes.identifier', $servers[1]->identifier);
});

test('filter only owner servers', function () {
    /** @var \Pterodactyl\Models\User[] $users */
    $users = User::factory()->times(3)->create();
    $servers = [
        $this->createServerModel(['user_id' => $users[0]->id]),
        $this->createServerModel(['user_id' => $users[1]->id]),
        $this->createServerModel(['user_id' => $users[2]->id]),
    ];

    Subuser::query()->create([
        'user_id' => $users[0]->id,
        'server_id' => $servers[1]->id,
        'permissions' => [Permission::ACTION_WEBSOCKET_CONNECT],
    ]);

    $response = $this->actingAs($users[0])->getJson('/api/client?type=owner');

    $response->assertOk();
    $response->assertJsonCount(1, 'data');
    $response->assertJsonPath('data.0.attributes.server_owner', true);
    $response->assertJsonPath('data.0.attributes.identifier', $servers[0]->identifier);
});

test('permissions are returned', function () {
    /** @var User $user */
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/client/permissions')
        ->assertOk()
        ->assertJson([
            'object' => 'system_permissions',
            'attributes' => [
                'permissions' => Permission::permissions()->toArray(),
            ],
        ]);
});

test('only admin level servers are returned', function () {
    /** @var \Pterodactyl\Models\User[] $users */
    $users = User::factory()->times(4)->create();
    $users[0]->update(['root_admin' => true]);

    $servers = [
        $this->createServerModel(['user_id' => $users[0]->id]),
        $this->createServerModel(['user_id' => $users[1]->id]),
        $this->createServerModel(['user_id' => $users[2]->id]),
        $this->createServerModel(['user_id' => $users[3]->id]),
    ];

    Subuser::query()->create([
        'user_id' => $users[0]->id,
        'server_id' => $servers[1]->id,
        'permissions' => [Permission::ACTION_WEBSOCKET_CONNECT],
    ]);

    $response = $this->actingAs($users[0])->getJson('/api/client?type=admin');

    $response->assertOk();
    $response->assertJsonCount(2, 'data');

    $response->assertJsonPath('data.0.attributes.server_owner', false);
    $response->assertJsonPath('data.0.attributes.identifier', $servers[2]->identifier);
    $response->assertJsonPath('data.1.attributes.server_owner', false);
    $response->assertJsonPath('data.1.attributes.identifier', $servers[3]->identifier);
});

test('all servers are returned to admin', function () {
    /** @var \Pterodactyl\Models\User[] $users */
    $users = User::factory()->times(4)->create();
    $users[0]->update(['root_admin' => true]);

    $servers = [
        $this->createServerModel(['user_id' => $users[0]->id]),
        $this->createServerModel(['user_id' => $users[1]->id]),
        $this->createServerModel(['user_id' => $users[2]->id]),
        $this->createServerModel(['user_id' => $users[3]->id]),
    ];

    Subuser::query()->create([
        'user_id' => $users[0]->id,
        'server_id' => $servers[1]->id,
        'permissions' => [Permission::ACTION_WEBSOCKET_CONNECT],
    ]);

    $response = $this->actingAs($users[0])->getJson('/api/client?type=admin-all');

    $response->assertOk();
    $response->assertJsonCount(4, 'data');
});

test('no servers are returned if admin filter is passed by regular user', function (string $type) {
    /** @var \Pterodactyl\Models\User[] $users */
    $users = User::factory()->times(3)->create();

    $this->createServerModel(['user_id' => $users[0]->id]);
    $this->createServerModel(['user_id' => $users[1]->id]);
    $this->createServerModel(['user_id' => $users[2]->id]);

    $response = $this->actingAs($users[0])->getJson('/api/client?type=' . $type);

    $response->assertOk();
    $response->assertJsonCount(0, 'data');
})->with([
    ['admin'],
    ['admin-all'],
]);

test('only primary allocation is returned to subuser', function () {
    /** @var Server $server */
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_WEBSOCKET_CONNECT]);
    $server->allocation->notes = 'Test notes';
    $server->allocation->save();

    Allocation::factory()->times(2)->create([
        'node_id' => $server->node_id,
        'server_id' => $server->id,
    ]);

    $server->refresh();
    $response = $this->actingAs($user)->getJson('/api/client');

    $response->assertOk();
    $response->assertJsonCount(1, 'data');
    $response->assertJsonPath('data.0.attributes.server_owner', false);
    $response->assertJsonPath('data.0.attributes.uuid', $server->uuid);
    $response->assertJsonCount(1, 'data.0.attributes.relationships.allocations.data');
    $response->assertJsonPath('data.0.attributes.relationships.allocations.data.0.attributes.id', $server->allocation->id);
    $response->assertJsonPath('data.0.attributes.relationships.allocations.data.0.attributes.notes', null);
});
