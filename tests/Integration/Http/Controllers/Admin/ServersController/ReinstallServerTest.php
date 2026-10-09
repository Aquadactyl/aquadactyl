<?php

use Pterodactyl\Models\User;
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

    $this->actingAs(User::factory()->admin()->create())
        ->withHeaders(['Accept' => 'text/html'])
        ->post(route('admin.servers.view.manage.reinstall', ['server' => $server]))
        ->assertRedirect();

    expect($server->refresh()->status)->toBe(Server::STATUS_INSTALLING);
});

test('server configured to skip scripts cannot be reinstalled', function () {
    $server = $this->createServerModel(['skip_scripts' => true]);

    $service = Mockery::mock(DaemonServerRepository::class);
    $this->app->instance(DaemonServerRepository::class, $service);

    $service->expects('setServer')->never();

    $this->actingAs(User::factory()->admin()->create())
        ->withHeaders(['Accept' => 'text/html'])
        ->post(route('admin.servers.view.manage.reinstall', ['server' => $server]))
        ->assertRedirect();

    expect($server->refresh()->status)->toBeNull();
});
