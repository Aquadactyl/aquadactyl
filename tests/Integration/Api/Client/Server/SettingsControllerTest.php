<?php

use Illuminate\Http\Response;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Permission;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;

test('server name can be changed', function (array $permissions) {
    /** @var Server $server */
    [$user, $server] = $this->generateTestAccount($permissions);
    $originalName = $server->name;
    $originalDescription = $server->description;

    $response = $this->actingAs($user)->postJson("/api/client/servers/$server->uuid/settings/rename", [
        'name' => '',
        'description' => '',
    ]);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    $response->assertJsonPath('errors.0.meta.rule', 'required');

    $server = $server->refresh();
    $this->assertSame($originalName, $server->name);
    $this->assertSame($originalDescription, $server->description);

    $this->actingAs($user)
        ->postJson("/api/client/servers/$server->uuid/settings/rename", [
            'name' => 'Test Server Name',
            'description' => 'This is a test server.',
        ])
        ->assertStatus(Response::HTTP_NO_CONTENT);

    $server = $server->refresh();
    $this->assertSame('Test Server Name', $server->name);
    $this->assertSame('This is a test server.', $server->description);
})->with([
    [[]],
    [[Permission::ACTION_SETTINGS_RENAME]],
]);

test('subuser cannot change server name without permission', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_WEBSOCKET_CONNECT]);
    $originalName = $server->name;

    $this->actingAs($user)
        ->postJson("/api/client/servers/$server->uuid/settings/rename", [
            'name' => 'Test Server Name',
        ])
        ->assertStatus(Response::HTTP_FORBIDDEN);

    $server = $server->refresh();
    $this->assertSame($originalName, $server->name);
});

test('server can be reinstalled', function (array $permissions) {
    /** @var Server $server */
    [$user, $server] = $this->generateTestAccount($permissions);
    $this->assertTrue($server->isInstalled());

    $service = \Mockery::mock(DaemonServerRepository::class);
    $this->app->instance(DaemonServerRepository::class, $service);

    $service->expects('setServer')
        ->with(\Mockery::on(function ($value) use ($server) {
            return $value->uuid === $server->uuid;
        }))
        ->andReturnSelf()
        ->getMock()
        ->expects('reinstall')
        ->andReturnUndefined();

    $this->actingAs($user)->postJson("/api/client/servers/$server->uuid/settings/reinstall")
        ->assertStatus(Response::HTTP_ACCEPTED);

    $server = $server->refresh();
    $this->assertSame(Server::STATUS_INSTALLING, $server->status);
})->with([
    [[]],
    [[Permission::ACTION_SETTINGS_REINSTALL]],
]);

test('subuser cannot reinstall server without permission', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_WEBSOCKET_CONNECT]);

    $this->actingAs($user)
        ->postJson("/api/client/servers/$server->uuid/settings/reinstall")
        ->assertStatus(Response::HTTP_FORBIDDEN);

    $server = $server->refresh();
    $this->assertTrue($server->isInstalled());
});

test('server cannot be reinstalled if configured to skip scripts', function (array $permissions) {
    [$user, $server] = $this->generateTestAccount($permissions);
    $server->update(['skip_scripts' => true]);

    $service = \Mockery::mock(DaemonServerRepository::class);
    $this->app->instance(DaemonServerRepository::class, $service);

    $service->expects('setServer')->never();

    $this->actingAs($user)
        ->postJson("/api/client/servers/$server->uuid/settings/reinstall")
        ->assertStatus(Response::HTTP_BAD_REQUEST)
        ->assertJsonPath('errors.0.detail', trans('admin/server.exceptions.skipping_install_script'));

    $this->assertNull($server->refresh()->status);
})->with([
    [[]],
    [[Permission::ACTION_SETTINGS_REINSTALL]],
]);

test('skip scripts state is exposed to client', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_SETTINGS_REINSTALL]);

    $this->actingAs($user)
        ->getJson("/api/client/servers/$server->uuid")
        ->assertOk()
        ->assertJsonPath('attributes.skip_scripts', false);

    $server->update(['skip_scripts' => true]);

    $this->actingAs($user)
        ->getJson("/api/client/servers/$server->uuid")
        ->assertOk()
        ->assertJsonPath('attributes.skip_scripts', true);
});
