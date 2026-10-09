<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Permission;
use Pterodactyl\Models\EggVariable;

test('startup variables are returned for server', function (array $permissions) {
    /** @var \Pterodactyl\Models\Server $server */
    [$user, $server] = $this->generateTestAccount($permissions);

    $egg = $this->cloneEggAndVariables($server->egg);
    // BUNGEE_VERSION should never be returned to the user in this API call, either in
    // the array of variables, or revealed in the startup command.
    $egg->variables()->first()->update([
        'user_viewable' => false,
    ]);

    $server->fill([
        'egg_id' => $egg->id,
        'startup' => 'java {{SERVER_JARFILE}} --version {{BUNGEE_VERSION}}',
    ])->save();
    $server = $server->refresh();

    $response = $this->actingAs($user)->getJson($this->link($server) . '/startup');

    $response->assertOk();
    $response->assertJsonPath('meta.startup_command', 'java bungeecord.jar --version [hidden]');
    $response->assertJsonPath('meta.raw_startup_command', $server->startup);

    $response->assertJsonPath('object', 'list');
    $response->assertJsonCount(1, 'data');
    $response->assertJsonPath('data.0.object', EggVariable::RESOURCE_NAME);
    $this->assertJsonTransformedWith($response->json('data.0.attributes'), $egg->variables[1]);
})->with([
    [[]],
    [[Permission::ACTION_STARTUP_READ]],
]);

test('startup data is not returned without permission', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_WEBSOCKET_CONNECT]);
    $this->actingAs($user)->getJson($this->link($server) . '/startup')->assertForbidden();

    $user2 = User::factory()->create();
    $this->actingAs($user2)->getJson($this->link($server) . '/startup')->assertNotFound();
});
