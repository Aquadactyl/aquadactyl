<?php

use Pterodactyl\Models\Database;
use Pterodactyl\Models\DatabaseHost;
use Pterodactyl\Services\Acl\Api\AdminAcl;
use Pterodactyl\Services\Databases\DatabasePasswordService;
use Pterodactyl\Services\Databases\DatabaseManagementService;

beforeEach(function () {
    $this->server = $this->createServerModel();
    $this->databaseHost = DatabaseHost::factory()->create();
    $this->database = Database::factory()->create([
        'server_id' => $this->server->id,
        'database_host_id' => $this->databaseHost->id,
        'database' => 's' . $this->server->id . '_existing',
    ]);
    $this->management = Mockery::mock(DatabaseManagementService::class);
    $this->passwordService = Mockery::mock(DatabasePasswordService::class);
    $this->app->instance(DatabaseManagementService::class, $this->management);
    $this->app->instance(DatabasePasswordService::class, $this->passwordService);
    $this->databaseUrl = '/api/application/servers/' . $this->server->id . '/databases';
});

test('application database listings and details omit encrypted credentials', function () {
    $this->getJson($this->databaseUrl)->assertOk()
        ->assertJsonPath('data.0.attributes.id', $this->database->id)
        ->assertJsonMissingPath('data.0.attributes.password');
    $this->getJson($this->databaseUrl . '/' . $this->database->id)->assertOk()
        ->assertJsonPath('attributes.database', $this->database->database)
        ->assertJsonMissingPath('attributes.password');
});

test('application database creation prefixes the server ID and maps the host field', function () {
    $this->management->shouldReceive('create')->once()->with(
        Mockery::on(fn ($server) => $server->id === $this->server->id),
        ['database' => 's' . $this->server->id . '_new_database', 'remote' => '192.168.1.%', 'database_host_id' => $this->databaseHost->id],
    )->andReturn($this->database);
    $this->postJson($this->databaseUrl, ['database' => 'new_database', 'remote' => '192.168.1.%', 'host' => $this->databaseHost->id])
        ->assertCreated()->assertJsonPath('attributes.id', $this->database->id)
        ->assertJsonPath('meta.resource', url($this->databaseUrl . '/' . $this->database->id));
});

test('application database creation rejects unsafe or incomplete connection settings', function (string $field, mixed $value) {
    $payload = ['database' => 'new_database', 'remote' => '%', 'host' => $this->databaseHost->id];
    $payload[$field] = $value;
    $this->management->shouldNotReceive('create');
    $this->postJson($this->databaseUrl, $payload)->assertUnprocessable();
})->with([
    ['database', ''], ['database', 'unsafe; DROP DATABASE test'], ['database', str_repeat('a', 49)],
    ['remote', 'localhost'], ['remote', '192.168.1.%;DROP'], ['remote', ''],
    ['host', 'invalid'], ['host', 99999999],
]);

test('application database password resets and deletions call the service for the bound database', function (string $operation) {
    $target = Mockery::on(fn ($database) => $database->id === $this->database->id);
    if ($operation === 'reset-password') {
        $this->passwordService->shouldReceive('handle')->once()->with($target);
        $this->postJson($this->databaseUrl . '/' . $this->database->id . '/reset-password')->assertNoContent();
    } else {
        $this->management->shouldReceive('delete')->once()->with($target);
        $this->deleteJson($this->databaseUrl . '/' . $this->database->id)->assertNoContent();
    }
})->with(['reset-password', 'delete']);

test('read only application keys cannot mutate server databases', function (string $method, string $suffix) {
    $this->createNewDefaultApiKey($this->getApiUser(), ['r_server_databases' => AdminAcl::READ]);
    $suffix = str_replace('{id}', (string) $this->database->id, $suffix);
    $this->json($method, $this->databaseUrl . $suffix, ['database' => 'new_database', 'remote' => '%', 'host' => $this->databaseHost->id])
        ->assertForbidden();
})->with([['POST', ''], ['POST', '/{id}/reset-password'], ['DELETE', '/{id}']]);

test('application database operations reject databases belonging to another server', function (string $method, string $suffix) {
    $otherServer = $this->createServerModel();
    $this->management->shouldNotReceive('delete');
    $this->passwordService->shouldNotReceive('handle');
    $this->json($method, '/api/application/servers/' . $otherServer->id . '/databases/' . $this->database->id . $suffix)->assertNotFound();
})->with([['GET', ''], ['POST', '/reset-password'], ['DELETE', '']]);
