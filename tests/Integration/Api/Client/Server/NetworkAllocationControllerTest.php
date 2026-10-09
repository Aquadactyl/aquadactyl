<?php

use Pterodactyl\Models\User;
use Illuminate\Http\Response;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Models\Permission;

test('server allocations are returned', function () {
    [$user, $server] = $this->generateTestAccount();

    $response = $this->actingAs($user)->getJson($this->link($server, '/network/allocations'));

    $response->assertOk();
    $response->assertJsonPath('object', 'list');
    $response->assertJsonCount(1, 'data');

    $this->assertJsonTransformedWith($response->json('data.0.attributes'), $server->allocation);
});

test('server allocations are not returned without permission', function () {
    [$user, $server] = $this->generateTestAccount();
    $user2 = User::factory()->create();

    $server->owner_id = $user2->id;
    $server->save();

    $this->actingAs($user)->getJson($this->link($server, '/network/allocations'))
        ->assertNotFound();

    [$user, $server] = $this->generateTestAccount([Permission::ACTION_ALLOCATION_CREATE]);

    $this->actingAs($user)->getJson($this->link($server, '/network/allocations'))
        ->assertForbidden();
});

test('allocation notes can be updated', function (array $permissions) {
    [$user, $server] = $this->generateTestAccount($permissions);
    $allocation = $server->allocation;

    expect($allocation->notes)->toBeNull();

    $this->actingAs($user)->postJson($this->link($allocation), [])
        ->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonPath('errors.0.meta.rule', 'present');

    $this->actingAs($user)->postJson($this->link($allocation), ['notes' => 'Test notes'])
        ->assertOk()
        ->assertJsonPath('object', Allocation::RESOURCE_NAME)
        ->assertJsonPath('attributes.notes', 'Test notes');

    $allocation = $allocation->refresh();

    expect($allocation->notes)->toBe('Test notes');

    $this->actingAs($user)->postJson($this->link($allocation), ['notes' => null])
        ->assertOk()
        ->assertJsonPath('object', Allocation::RESOURCE_NAME)
        ->assertJsonPath('attributes.notes', null);

    $allocation = $allocation->refresh();

    expect($allocation->notes)->toBeNull();
})->with([
    [[]],
    [[Permission::ACTION_ALLOCATION_UPDATE]],
]);

test('allocation notes cannot be updated by invalid users', function () {
    [$user, $server] = $this->generateTestAccount();
    $user2 = User::factory()->create();

    $server->owner_id = $user2->id;
    $server->save();

    $this->actingAs($user)->postJson($this->link($server->allocation))->assertNotFound();

    [$user, $server] = $this->generateTestAccount([Permission::ACTION_ALLOCATION_CREATE]);

    $this->actingAs($user)->postJson($this->link($server->allocation))->assertForbidden();
});

test('primary allocation can be modified', function (array $permissions) {
    [$user, $server] = $this->generateTestAccount($permissions);
    $allocation = $server->allocation;
    $allocation2 = Allocation::factory()->create(['node_id' => $server->node_id, 'server_id' => $server->id]);

    $server->allocation_id = $allocation->id;
    $server->save();

    $this->actingAs($user)->postJson($this->link($allocation2, '/primary'))
        ->assertOk();

    $server = $server->refresh();

    expect($server->allocation_id)->toBe($allocation2->id);
})->with([
    [[]],
    [[Permission::ACTION_ALLOCATION_UPDATE]],
]);

test('primary allocation cannot be modified by invalid user', function () {
    [$user, $server] = $this->generateTestAccount();
    $user2 = User::factory()->create();

    $server->owner_id = $user2->id;
    $server->save();

    $this->actingAs($user)->postJson($this->link($server->allocation, '/primary'))
        ->assertNotFound();

    [$user, $server] = $this->generateTestAccount([Permission::ACTION_ALLOCATION_CREATE]);

    $this->actingAs($user)->postJson($this->link($server->allocation, '/primary'))
        ->assertForbidden();
});
