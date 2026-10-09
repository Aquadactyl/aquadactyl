<?php

use Illuminate\Http\Response;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Models\Permission;

beforeEach(function () {
    config()->set('pterodactyl.client_features.allocations.enabled', true);
    config()->set('pterodactyl.client_features.allocations.range_start', 5000);
    config()->set('pterodactyl.client_features.allocations.range_end', 5050);
});

test('new allocation can be assigned to server', function (array $permission) {
    /** @var \Pterodactyl\Models\Server $server */
    [$user, $server] = $this->generateTestAccount($permission);
    $server->update(['allocation_limit' => 2]);

    $response = $this->actingAs($user)->postJson($this->link($server, '/network/allocations'));
    $response->assertJsonPath('object', Allocation::RESOURCE_NAME);

    $matched = Allocation::query()->findOrFail($response->json('attributes.id'));

    expect($matched->server_id)->toBe($server->id);
    $this->assertJsonTransformedWith($response->json('attributes'), $matched);
})->with([
    [[Permission::ACTION_ALLOCATION_CREATE]],
    [[]],
]);

test('allocation cannot be created if user does not have permission', function () {
    /** @var \Pterodactyl\Models\Server $server */
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_ALLOCATION_UPDATE]);
    $server->update(['allocation_limit' => 2]);

    $this->actingAs($user)->postJson($this->link($server, '/network/allocations'))->assertForbidden();
});

test('allocation cannot be created if not enabled', function () {
    config()->set('pterodactyl.client_features.allocations.enabled', false);

    /** @var \Pterodactyl\Models\Server $server */
    [$user, $server] = $this->generateTestAccount();
    $server->update(['allocation_limit' => 2]);

    $this->actingAs($user)->postJson($this->link($server, '/network/allocations'))
        ->assertStatus(Response::HTTP_BAD_REQUEST)
        ->assertJsonPath('errors.0.code', 'AutoAllocationNotEnabledException')
        ->assertJsonPath('errors.0.detail', 'Server auto-allocation is not enabled for this instance.');
});

test('allocation cannot be created if server is at limit', function () {
    /** @var \Pterodactyl\Models\Server $server */
    [$user, $server] = $this->generateTestAccount();
    $server->update(['allocation_limit' => 1]);

    $this->actingAs($user)->postJson($this->link($server, '/network/allocations'))
        ->assertStatus(Response::HTTP_BAD_REQUEST)
        ->assertJsonPath('errors.0.code', 'DisplayException')
        ->assertJsonPath('errors.0.detail', 'Cannot assign additional allocations to this server: limit has been reached.');
});
