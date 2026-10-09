<?php

use Illuminate\Http\Response;
use Pterodactyl\Models\Permission;
use Pterodactyl\Repositories\Wings\DaemonPowerRepository;

test('subuser without permissions receives error', function (string $action, array $permissions) {
    [$user, $server] = $this->generateTestAccount($permissions);

    $this->actingAs($user)
        ->postJson("/api/client/servers/$server->uuid/power", ['signal' => $action])
        ->assertStatus(Response::HTTP_FORBIDDEN);
})->with([
    ['start', [Permission::ACTION_CONTROL_STOP, Permission::ACTION_CONTROL_RESTART]],
    ['stop', [Permission::ACTION_CONTROL_START]],
    ['kill', [Permission::ACTION_CONTROL_START, Permission::ACTION_CONTROL_RESTART]],
    ['restart', [Permission::ACTION_CONTROL_STOP, Permission::ACTION_CONTROL_START]],
    ['random', [Permission::ACTION_CONTROL_START]],
]);

test('invalid power signal results in error', function () {
    [$user, $server] = $this->generateTestAccount();

    $response = $this->actingAs($user)->postJson("/api/client/servers/$server->uuid/power", [
        'signal' => 'invalid',
    ]);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    $response->assertJsonPath('errors.0.meta.rule', 'in');
    $response->assertJsonPath('errors.0.detail', 'The selected signal is invalid.');
});

test('action can be sent to server', function (string $action, string $permission) {
    $service = \Mockery::mock(DaemonPowerRepository::class);
    $this->app->instance(DaemonPowerRepository::class, $service);

    [$user, $server] = $this->generateTestAccount([$permission]);

    $service->expects('setServer')
        ->with(\Mockery::on(function ($value) use ($server) {
            return $server->uuid === $value->uuid;
        }))
        ->andReturnSelf()
        ->getMock()
        ->expects('send')
        ->with(trim($action));

    $this->actingAs($user)
        ->postJson("/api/client/servers/$server->uuid/power", ['signal' => $action])
        ->assertStatus(Response::HTTP_NO_CONTENT);
})->with([
    ['start', Permission::ACTION_CONTROL_START],
    ['stop', Permission::ACTION_CONTROL_STOP],
    ['restart', Permission::ACTION_CONTROL_RESTART],
    ['kill', Permission::ACTION_CONTROL_STOP],
    // Yes, these spaces are intentional. You should be able to send values with or without
    // a space on the start/end since we should be trimming the values.
    [' restart', Permission::ACTION_CONTROL_RESTART],
    ['kill ', Permission::ACTION_CONTROL_STOP],
]);
