<?php

use Pterodactyl\Models\User;
use Pterodactyl\Services\Servers\BuildModificationService;
use Pterodactyl\Services\Servers\DetailsModificationService;
use Pterodactyl\Services\Servers\StartupModificationService;

test('application build updates normalize both legacy and nested resource limits', function (bool $legacy) {
    $server = $this->createServerModel();
    $limits = ['memory' => 1024, 'swap' => 0, 'io' => 500, 'cpu' => 100, 'disk' => 2048, 'threads' => '0-1'];
    $payload = ['allocation' => $server->allocation_id, 'oom_disabled' => true,
        'feature_limits' => ['databases' => 1, 'allocations' => 2, 'backups' => 3],
        'add_allocations' => [], 'remove_allocations' => []];
    $payload = $legacy ? array_merge($payload, $limits) : array_merge($payload, ['limits' => $limits]);
    $service = Mockery::mock(BuildModificationService::class);
    $service->shouldReceive('handle')->once()->with(Mockery::on(fn ($model) => $model->id === $server->id), Mockery::on(function ($values) use ($server, $limits) {
        expect($values)->toMatchArray($limits + ['allocation_id' => $server->allocation_id, 'database_limit' => 1, 'allocation_limit' => 2, 'backup_limit' => 3])
            ->not->toHaveKeys(['allocation', 'feature_limits', 'limits']);

        return true;
    }))->andReturn($server);
    $this->app->instance(BuildModificationService::class, $service);
    $this->patchJson('/api/application/servers/' . $server->id . '/build', $payload)->assertOk()->assertJsonPath('attributes.uuid', $server->uuid);
})->with([false, true]);

test('application build updates reject malformed limits without invoking the service', function (string $field, mixed $value) {
    $server = $this->createServerModel();
    $payload = ['allocation' => $server->allocation_id,
        'limits' => ['memory' => 1024, 'swap' => 0, 'io' => 500, 'cpu' => 100, 'disk' => 2048],
        'feature_limits' => ['databases' => 1, 'allocations' => 2, 'backups' => 3]];
    data_set($payload, $field, $value);
    $service = Mockery::mock(BuildModificationService::class);
    $service->shouldNotReceive('handle');
    $this->app->instance(BuildModificationService::class, $service);
    $this->patchJson('/api/application/servers/' . $server->id . '/build', $payload)->assertUnprocessable();
})->with([['limits.memory', -1], ['limits.io', 1001], ['feature_limits.databases', -1], ['add_allocations', 'invalid'], ['remove_allocations', ['invalid']]]);

test('application server details normalize owner and description fields', function () {
    $server = $this->createServerModel();
    $service = Mockery::mock(DetailsModificationService::class);
    $service->shouldReceive('returnUpdatedModel')->once()->andReturnSelf();
    $service->shouldReceive('handle')->once()->with(Mockery::on(fn ($model) => $model->id === $server->id), [
        'external_id' => 'billing-123', 'name' => 'Renamed server', 'owner_id' => $server->owner_id, 'description' => null,
    ])->andReturn($server);
    $this->app->instance(DetailsModificationService::class, $service);
    $this->patchJson('/api/application/servers/' . $server->id . '/details', ['external_id' => 'billing-123', 'name' => 'Renamed server', 'user' => $server->owner_id])->assertOk();
});

test('application startup updates map egg and image fields and retain administrator permissions', function () {
    $server = $this->createServerModel();
    $service = Mockery::mock(StartupModificationService::class);
    $service->shouldReceive('setUserLevel')->once()->with(User::USER_LEVEL_ADMIN)->andReturnSelf();
    $service->shouldReceive('handle')->once()->with(Mockery::on(fn ($model) => $model->id === $server->id), [
        'startup' => 'java -jar server.jar', 'environment' => ['SERVER_JARFILE' => 'server.jar'], 'skip_scripts' => true,
        'egg_id' => $server->egg_id, 'docker_image' => 'ghcr.io/pterodactyl/yolks:java_25',
    ])->andReturn($server);
    $this->app->instance(StartupModificationService::class, $service);
    $this->patchJson('/api/application/servers/' . $server->id . '/startup', ['startup' => 'java -jar server.jar',
        'environment' => ['SERVER_JARFILE' => 'server.jar'], 'skip_scripts' => true, 'egg' => $server->egg_id, 'image' => 'ghcr.io/pterodactyl/yolks:java_25'])->assertOk();
});
