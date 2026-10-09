<?php

use GuzzleHttp\Psr7\Request;
use Illuminate\Http\Response;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Permission;
use GuzzleHttp\Exception\BadResponseException;
use GuzzleHttp\Psr7\Response as GuzzleResponse;
use Pterodactyl\Repositories\Wings\DaemonCommandRepository;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

test('validation error is returned if no command is present', function () {
    [$user, $server] = $this->generateTestAccount();

    $response = $this->actingAs($user)->postJson("/api/client/servers/$server->uuid/command", [
        'command' => '',
    ]);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    $response->assertJsonPath('errors.0.meta.rule', 'required');
});

test('subuser without permission receives error', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_WEBSOCKET_CONNECT]);

    $response = $this->actingAs($user)->postJson("/api/client/servers/$server->uuid/command", [
        'command' => 'say Test',
    ]);

    $response->assertStatus(Response::HTTP_FORBIDDEN);
});

test('command can send to server', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_CONTROL_CONSOLE]);

    $mock = $this->mock(DaemonCommandRepository::class);
    $mock->expects('setServer')
        ->with(Mockery::on(fn (Server $value) => $value->is($server)))
        ->andReturnSelf();

    $mock->expects('send')->with('say Test')->andReturn(new GuzzleResponse());

    $response = $this->actingAs($user)->postJson("/api/client/servers/$server->uuid/command", [
        'command' => 'say Test',
    ]);

    $response->assertStatus(Response::HTTP_NO_CONTENT);
});

test('error is returned when server is offline', function () {
    [$user, $server] = $this->generateTestAccount();

    $mock = $this->mock(DaemonCommandRepository::class);
    $mock->expects('setServer->send')->andThrows(
        new DaemonConnectionException(
            new BadResponseException('', new Request('GET', 'test'), new GuzzleResponse(Response::HTTP_BAD_GATEWAY))
        )
    );

    $response = $this->actingAs($user)->postJson("/api/client/servers/$server->uuid/command", [
        'command' => 'say Test',
    ]);

    $response->assertStatus(Response::HTTP_BAD_GATEWAY);
    $response->assertJsonPath('errors.0.code', 'HttpException');
    $response->assertJsonPath('errors.0.detail', 'Server must be online in order to send commands.');
});
