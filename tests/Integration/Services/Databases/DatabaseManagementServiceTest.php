<?php

use Pterodactyl\Models\Database;
use Pterodactyl\Models\DatabaseHost;
use Pterodactyl\Repositories\Eloquent\DatabaseRepository;
use Pterodactyl\Services\Databases\DatabaseManagementService;
use Pterodactyl\Exceptions\Repository\DuplicateDatabaseNameException;
use Pterodactyl\Exceptions\Service\Database\TooManyDatabasesException;
use Pterodactyl\Exceptions\Service\Database\DatabaseClientFeatureNotEnabledException;

beforeEach(function () {
    config()->set('pterodactyl.client_features.databases.enabled', true);
    $this->repository = $this->mock(DatabaseRepository::class);
});

test('unique database name is generated correctly', function () {
    expect(DatabaseManagementService::generateUniqueDatabaseName('example', 1))->toBe('s1_example')
        ->and(DatabaseManagementService::generateUniqueDatabaseName('something_else', 123))->toBe('s123_something_else')
        ->and(DatabaseManagementService::generateUniqueDatabaseName(str_repeat('a', 100), 123))->toBe('s123_' . str_repeat('a', 43));
});

test('exception is thrown if client databases are not enabled', function () {
    config()->set('pterodactyl.client_features.databases.enabled', false);

    $this->expectException(DatabaseClientFeatureNotEnabledException::class);

    $server = $this->createServerModel();
    app(DatabaseManagementService::class)->create($server, []);
});

test('database cannot be created if server has reached limit', function () {
    $server = $this->createServerModel(['database_limit' => 2]);
    $host = DatabaseHost::factory()->create(['node_id' => $server->node_id]);

    Database::factory()->times(2)->create(['server_id' => $server->id, 'database_host_id' => $host->id]);

    $this->expectException(TooManyDatabasesException::class);

    app(DatabaseManagementService::class)->create($server, []);
});

test('empty database name or invalid name triggers an exception', function (array $data) {
    $server = $this->createServerModel();

    $this->expectException(\InvalidArgumentException::class);
    $this->expectExceptionMessage('The database name passed to DatabaseManagementService::handle MUST be prefixed with "s{server_id}_".');

    app(DatabaseManagementService::class)->create($server, $data);
})->with([
    [[]],
    [['database' => '']],
    [['database' => 'something']],
    [['database' => 's_something']],
    [['database' => 's12s_something']],
    [['database' => 's12something']],
]);

test('creating database with identical name triggers an exception', function () {
    $server = $this->createServerModel();
    $name = DatabaseManagementService::generateUniqueDatabaseName('soemthing', $server->id);

    $host = DatabaseHost::factory()->create(['node_id' => $server->node_id]);
    $host2 = DatabaseHost::factory()->create(['node_id' => $server->node_id]);
    Database::factory()->create([
        'database' => $name,
        'database_host_id' => $host->id,
        'server_id' => $server->id,
    ]);

    // Try to create a database with the same name as a database on a different host. We expect
    // this to fail since we don't account for the specific host when checking uniqueness.
    expect(fn () => app(DatabaseManagementService::class)->create($server, [
        'database' => $name,
        'database_host_id' => $host2->id,
    ]))->toThrow(DuplicateDatabaseNameException::class, 'A database with that name already exists for this server.');

    $this->assertDatabaseMissing('databases', [
        'server_id' => $server->id,
        'database_host_id' => $host2->id,
    ]);
});

test('server database can be created', function () {
    $server = $this->createServerModel();
    $name = DatabaseManagementService::generateUniqueDatabaseName('soemthing', $server->id);

    $host = DatabaseHost::factory()->create(['node_id' => $server->node_id]);

    $this->repository->expects('createDatabase')->with($name);

    $username = null;
    $secondUsername = null;
    $password = null;

    $this->repository->expects('createUser')->with(
        Mockery::on(function ($value) use (&$username) {
            $username = $value;

            return true;
        }),
        '%',
        Mockery::on(function ($value) use (&$password) {
            $password = $value;

            return true;
        }),
        null
    );

    $this->repository->expects('assignUserToDatabase')->with($name, Mockery::on(function ($value) use (&$secondUsername) {
        $secondUsername = $value;

        return true;
    }), '%');

    $this->repository->expects('flush')->withNoArgs();

    $response = app(DatabaseManagementService::class)->create($server, [
        'remote' => '%',
        'database' => $name,
        'database_host_id' => $host->id,
    ]);

    expect($response)->toBeInstanceOf(Database::class)
        ->and($response->server_id)->toBe($server->id)
        ->and($username)->toMatch('/^(u\d+_)(\w){10}$/')
        ->and($secondUsername)->toBe($username)
        ->and(strlen($password))->toBe(24);

    $this->assertDatabaseHas('databases', ['server_id' => $server->id, 'id' => $response->id]);
});

test('exception encountered while creating database attempts to cleanup', function () {
    $server = $this->createServerModel();
    $name = DatabaseManagementService::generateUniqueDatabaseName('soemthing', $server->id);

    $host = DatabaseHost::factory()->create(['node_id' => $server->node_id]);

    $this->repository->expects('createDatabase')->with($name)->andThrows(new \BadMethodCallException());
    $this->repository->expects('dropDatabase')->with($name);
    $this->repository->expects('dropUser')->withAnyArgs()->andThrows(new \InvalidArgumentException());

    expect(fn () => app(DatabaseManagementService::class)->create($server, [
        'remote' => '%',
        'database' => $name,
        'database_host_id' => $host->id,
    ]))->toThrow(\BadMethodCallException::class);

    $this->assertDatabaseMissing('databases', ['server_id' => $server->id]);
});
