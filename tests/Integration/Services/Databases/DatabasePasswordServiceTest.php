<?php

use Pterodactyl\Models\Database;
use Pterodactyl\Models\DatabaseHost;
use Pterodactyl\Repositories\Eloquent\DatabaseRepository;
use Pterodactyl\Services\Databases\DatabasePasswordService;

beforeEach(function () {
    $this->repository = $this->mock(DatabaseRepository::class);
});

test('database password can be rotated', function () {
    $server = $this->createServerModel();
    $host = DatabaseHost::factory()->create(['node_id' => $server->node_id]);

    $database = Database::factory()->create([
        'server_id' => $server->id,
        'database_host_id' => $host->id,
        'password' => encrypt('original'),
    ]);

    $other = Database::factory()->create([
        'server_id' => $server->id,
        'database_host_id' => $host->id,
        'password' => encrypt('unchanged'),
    ]);

    $password = null;

    $this->repository->expects('dropUser')->with($database->username, $database->remote);
    $this->repository->expects('createUser')->with(
        $database->username,
        $database->remote,
        Mockery::on(function ($value) use (&$password) {
            $password = $value;

            return true;
        }),
        $database->max_connections
    );
    $this->repository->expects('assignUserToDatabase')->with($database->database, $database->username, $database->remote);
    $this->repository->expects('flush')->withNoArgs();

    $response = app(DatabasePasswordService::class)->handle($database);

    // The new password is returned, set on the host, and stored.
    expect(strlen($response))->toBe(24)
        ->and($response)->toBe($password)
        ->and(decrypt($database->refresh()->password))->toBe($response)
        // Other databases are untouched.
        ->and(decrypt($other->refresh()->password))->toBe('unchanged');
});
