<?php

use Pterodactyl\Models\Database;
use Pterodactyl\Models\DatabaseHost;
use Pterodactyl\Services\Databases\DatabasePasswordService;
use Pterodactyl\Services\Databases\DeployServerDatabaseService;

test('database creation returns its credentials and list calls keep passwords private', function () {
    [$user, $server] = $this->generateTestAccount();
    $server->update(['database_limit' => 2]);
    $host = DatabaseHost::factory()->create();
    $this->mock(DeployServerDatabaseService::class)->shouldReceive('handle')->once()->with(Mockery::on(fn ($model) => $model->id === $server->id), ['database' => 'application', 'remote' => '%'])
        ->andReturnUsing(fn () => Database::factory()->create(['server_id' => $server->id, 'database_host_id' => $host->id, 'database' => 's' . $server->id . '_application']));
    $this->actingAs($user)->postJson($this->link($server, '/databases'), ['database' => 'application', 'remote' => '%'])->assertOk()->assertJsonPath('attributes.relationships.password.attributes.password', 'test123');
    $this->getJson($this->link($server, '/databases'))->assertOk()->assertJsonCount(1, 'data')->assertJsonMissingPath('data.0.attributes.relationships.password');
    $database = Database::where('server_id', $server->id)->firstOrFail();
    $this->mock(DatabasePasswordService::class)->shouldReceive('handle')->once()->with(Mockery::on(fn ($model) => $model->id === $database->id))
        ->andReturnUsing(function ($model) {
            $model->update(['password' => encrypt('rotated-password')]);

            return 'rotated-password';
        });
    $this->postJson($this->link($server, '/databases/' . app('hashids')->encode($database->id) . '/rotate-password'))->assertOk()->assertJsonPath('attributes.relationships.password.attributes.password', 'rotated-password');
});

test('database limits reject new provisioning before contacting a database host', function () {
    [$user, $server] = $this->generateTestAccount();
    $server->update(['database_limit' => 0]);
    $this->mock(DeployServerDatabaseService::class)->shouldNotReceive('handle');
    $this->actingAs($user)->postJson($this->link($server, '/databases'), ['database' => 'application', 'remote' => '%'])->assertBadRequest();
});

test('existing prefixed database names cannot be created twice', function () {
    [$user, $server] = $this->generateTestAccount();
    Database::factory()->create(['server_id' => $server->id, 'database_host_id' => DatabaseHost::factory()->create()->id, 'database' => 's' . $server->id . '_application']);
    $this->mock(DeployServerDatabaseService::class)->shouldNotReceive('handle');
    $this->actingAs($user)->postJson($this->link($server, '/databases'), ['database' => 'application', 'remote' => '%'])->assertUnprocessable();
});
