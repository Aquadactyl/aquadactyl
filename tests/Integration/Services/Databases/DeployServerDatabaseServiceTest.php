<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\Database;
use Pterodactyl\Models\DatabaseHost;
use Pterodactyl\Services\Databases\DatabaseManagementService;
use Pterodactyl\Services\Databases\DeployServerDatabaseService;
use Pterodactyl\Exceptions\Service\Database\NoSuitableDatabaseHostException;

beforeEach(function () {
    $this->managementService = Mockery::mock(DatabaseManagementService::class);
    $this->swap(DatabaseManagementService::class, $this->managementService);
});

afterEach(function () {
    config()->set('pterodactyl.client_features.databases.allow_random', true);

    Database::query()->delete();
    DatabaseHost::query()->delete();
});

test('error is thrown if database name is empty', function (array $data) {
    $server = $this->createServerModel();

    $this->expectException(\InvalidArgumentException::class);
    $this->expectExceptionMessageMatches('/^Expected a non-empty value\. Got: /');

    app(DeployServerDatabaseService::class)->handle($server, $data);
})->with([
    [['remote' => '%']],
    [['database' => null, 'remote' => '%']],
    [['database' => '', 'remote' => '%']],
    [['database' => '']],
    [['database' => '', 'remote' => '']],
]);

test('error is thrown if no database hosts exist on node', function () {
    $server = $this->createServerModel();

    $node = Node::factory()->create(['location_id' => $server->location->id]);
    DatabaseHost::factory()->create(['node_id' => $node->id]);

    config()->set('pterodactyl.client_features.databases.allow_random', false);

    $this->expectException(NoSuitableDatabaseHostException::class);

    app(DeployServerDatabaseService::class)->handle($server, [
        'database' => 'something',
        'remote' => '%',
    ]);
});

test('error is thrown if no database hosts exist on system', function () {
    $server = $this->createServerModel();

    $this->expectException(NoSuitableDatabaseHostException::class);

    app(DeployServerDatabaseService::class)->handle($server, [
        'database' => 'something',
        'remote' => '%',
    ]);
});

test('database host on same node is preferred', function () {
    $server = $this->createServerModel();

    $node = Node::factory()->create(['location_id' => $server->location->id]);
    DatabaseHost::factory()->create(['node_id' => $node->id]);
    $host = DatabaseHost::factory()->create(['node_id' => $server->node_id]);

    $this->managementService->expects('create')->with($server, [
        'database_host_id' => $host->id,
        'database' => "s{$server->id}_something",
        'remote' => '%',
    ])->andReturns(new Database());

    $response = app(DeployServerDatabaseService::class)->handle($server, [
        'database' => 'something',
        'remote' => '%',
    ]);

    expect($response)->toBeInstanceOf(Database::class);
});

test('database host is selected if no suitable host exists on same node', function () {
    $server = $this->createServerModel();

    $node = Node::factory()->create(['location_id' => $server->location->id]);
    $host = DatabaseHost::factory()->create(['node_id' => $node->id]);

    $this->managementService->expects('create')->with($server, [
        'database_host_id' => $host->id,
        'database' => "s{$server->id}_something",
        'remote' => '%',
    ])->andReturns(new Database());

    $response = app(DeployServerDatabaseService::class)->handle($server, [
        'database' => 'something',
        'remote' => '%',
    ]);

    expect($response)->toBeInstanceOf(Database::class);
});
