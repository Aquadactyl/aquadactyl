<?php

use Illuminate\Http\Response;
use Pterodactyl\Models\Server;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;

test('server can be reinstalled', function () {
    $server = $this->createServerModel();

    $service = Mockery::mock(DaemonServerRepository::class);
    $this->app->instance(DaemonServerRepository::class, $service);

    $service->expects('setServer')
        ->with(Mockery::on(fn ($value) => $value->uuid === $server->uuid))
        ->andReturnSelf()
        ->getMock()
        ->expects('reinstall')
        ->andReturnUndefined();

    $this->postJson('/api/application/servers/' . $server->id . '/reinstall')
        ->assertStatus(Response::HTTP_NO_CONTENT);

    expect($server->refresh()->status)->toBe(Server::STATUS_INSTALLING);
});

test('server configured to skip scripts cannot be reinstalled', function () {
    $server = $this->createServerModel(['skip_scripts' => true]);

    $service = Mockery::mock(DaemonServerRepository::class);
    $this->app->instance(DaemonServerRepository::class, $service);

    $service->expects('setServer')->never();

    $this->postJson('/api/application/servers/' . $server->id . '/reinstall')
        ->assertStatus(Response::HTTP_BAD_REQUEST)
        ->assertJsonPath('errors.0.detail', trans('admin/server.exceptions.skipping_install_script'));
});

test('blocked reinstall returns an error to clients not requesting json', function () {
    $server = $this->createServerModel(['skip_scripts' => true]);

    $service = Mockery::mock(DaemonServerRepository::class);
    $this->app->instance(DaemonServerRepository::class, $service);

    $service->expects('setServer')->never();

    $this->post('/api/application/servers/' . $server->id . '/reinstall', [], ['Accept' => '*/*'])
        ->assertStatus(Response::HTTP_BAD_REQUEST)
        ->assertJsonPath('errors.0.detail', trans('admin/server.exceptions.skipping_install_script'));
});

test('server configured to skip scripts can be reinstalled from a failed state', function (string $status) {
    $server = $this->createServerModel(['skip_scripts' => true, 'status' => $status]);

    $service = Mockery::mock(DaemonServerRepository::class);
    $this->app->instance(DaemonServerRepository::class, $service);

    $service->expects('setServer')
        ->with(Mockery::on(fn ($value) => $value->uuid === $server->uuid))
        ->andReturnSelf()
        ->getMock()
        ->expects('reinstall')
        ->andReturnUndefined();

    $this->postJson('/api/application/servers/' . $server->id . '/reinstall')
        ->assertStatus(Response::HTTP_NO_CONTENT);

    expect($server->refresh()->status)->toBe(Server::STATUS_INSTALLING);
})->with([
    [Server::STATUS_INSTALLING],
    [Server::STATUS_INSTALL_FAILED],
    [Server::STATUS_REINSTALL_FAILED],
]);
