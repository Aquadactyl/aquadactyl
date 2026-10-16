<?php

use Pterodactyl\Models\Permission;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;

test('server resource utilization is returned', function () {
    $service = Mockery::mock(DaemonServerRepository::class);
    $this->app->instance(DaemonServerRepository::class, $service);

    [$user, $server] = $this->generateTestAccount([Permission::ACTION_WEBSOCKET_CONNECT]);

    $service->expects('setServer')->with(Mockery::on(function ($value) use ($server) {
        return $server->uuid === $value->uuid;
    }))->andReturnSelf()->getMock()->expects('getDetails')->andReturns([]);

    $response = $this->actingAs($user)->getJson("/api/client/servers/$server->uuid/resources");

    $response->assertOk();
    $response->assertJson([
        'object' => 'stats',
        'attributes' => [
            'current_state' => 'stopped',
            'is_suspended' => false,
            'resources' => [
                'memory_bytes' => 0,
                'cpu_absolute' => 0,
                'disk_bytes' => 0,
                'network_rx_bytes' => 0,
                'network_tx_bytes' => 0,
            ],
        ],
    ]);
});

test('offline and transitional resource states expire after two seconds', function (string $state) {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_WEBSOCKET_CONNECT]);
    $service = Mockery::mock(DaemonServerRepository::class);
    $this->app->instance(DaemonServerRepository::class, $service);
    $service->shouldReceive('setServer')->andReturnSelf();
    $service->expects('getDetails')->twice()->andReturn(['state' => $state], ['state' => 'running']);

    $url = "/api/client/servers/$server->uuid/resources";
    $this->actingAs($user)->getJson($url)->assertOk()->assertJsonPath('attributes.current_state', $state);
    $this->travel(1)->seconds();
    $this->getJson($url)->assertOk()->assertJsonPath('attributes.current_state', $state);
    $this->travel(2)->seconds();
    $this->getJson($url)->assertOk()->assertJsonPath('attributes.current_state', 'running');
})->with(['offline', 'starting', 'stopping']);

test('running resource states retain the normal twenty second cache', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_WEBSOCKET_CONNECT]);
    $service = Mockery::mock(DaemonServerRepository::class);
    $this->app->instance(DaemonServerRepository::class, $service);
    $service->shouldReceive('setServer')->andReturnSelf();
    $service->expects('getDetails')->twice()->andReturn(['state' => 'running'], ['state' => 'offline']);

    $url = "/api/client/servers/$server->uuid/resources";
    $this->actingAs($user)->getJson($url)->assertOk()->assertJsonPath('attributes.current_state', 'running');
    $this->travel(19)->seconds();
    $this->getJson($url)->assertOk()->assertJsonPath('attributes.current_state', 'running');
    $this->travel(2)->seconds();
    $this->getJson($url)->assertOk()->assertJsonPath('attributes.current_state', 'offline');
});

test('power actions isolate fresh resource data from stale in flight cache writes', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_WEBSOCKET_CONNECT]);
    // A request begun before a power action may finish after that action cleared its cache.
    Cache::put("resources:$server->uuid", ['state' => 'offline'], 20);
    Cache::put("resources:power:$server->uuid", true, 60);
    $service = Mockery::mock(DaemonServerRepository::class);
    $this->app->instance(DaemonServerRepository::class, $service);
    $service->shouldReceive('setServer')->andReturnSelf();
    $service->expects('getDetails')->times(3)->andReturn(['state' => 'running'], ['state' => 'offline'], ['state' => 'running']);

    $url = "/api/client/servers/$server->uuid/resources";
    $this->actingAs($user)->getJson($url)->assertOk()->assertJsonPath('attributes.current_state', 'running');
    $this->travel(1)->seconds();
    $this->getJson($url)->assertOk()->assertJsonPath('attributes.current_state', 'running');
    $this->travel(2)->seconds();
    $this->getJson($url)->assertOk()->assertJsonPath('attributes.current_state', 'offline');
    $this->travel(60)->seconds();
    $this->getJson($url)->assertOk()->assertJsonPath('attributes.current_state', 'running');
});
