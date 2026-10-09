<?php

use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Database;
use Pterodactyl\Models\DatabaseHost;
use GuzzleHttp\Exception\BadResponseException;
use Pterodactyl\Services\Servers\ServerDeletionService;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;
use Pterodactyl\Services\Databases\DatabaseManagementService;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

beforeEach(function () {
    $this->defaultLogger = config('logging.default');
    config()->set('logging.default', 'null');

    $this->daemonServerRepository = Mockery::mock(DaemonServerRepository::class);
    $this->databaseManagementService = Mockery::mock(DatabaseManagementService::class);

    $this->app->instance(DaemonServerRepository::class, $this->daemonServerRepository);
    $this->app->instance(DatabaseManagementService::class, $this->databaseManagementService);
});

afterEach(function () {
    config()->set('logging.default', $this->defaultLogger);
});

test('regular delete fails if wings returns error', function () {
    $server = $this->createServerModel();

    $this->daemonServerRepository->expects('setServer->delete')->withNoArgs()->andThrows(
        new DaemonConnectionException(new BadResponseException('Bad request', new Request('GET', '/test'), new Response()))
    );

    expect(fn () => app(ServerDeletionService::class)->handle($server))
        ->toThrow(DaemonConnectionException::class);

    $this->assertDatabaseHas('servers', ['id' => $server->id]);
});

test('regular delete ignores 404 from wings', function () {
    $server = $this->createServerModel();

    $this->daemonServerRepository->expects('setServer->delete')->withNoArgs()->andThrows(
        new DaemonConnectionException(new BadResponseException('Bad request', new Request('GET', '/test'), new Response(404)))
    );

    app(ServerDeletionService::class)->handle($server);

    $this->assertDatabaseMissing('servers', ['id' => $server->id]);
});

test('force delete ignores exception from wings', function () {
    $server = $this->createServerModel();

    $this->daemonServerRepository->expects('setServer->delete')->withNoArgs()->andThrows(
        new DaemonConnectionException(new BadResponseException('Bad request', new Request('GET', '/test'), new Response(500)))
    );

    app(ServerDeletionService::class)->withForce()->handle($server);

    $this->assertDatabaseMissing('servers', ['id' => $server->id]);
});

test('exception while deleting stops process', function () {
    $server = $this->createServerModel();
    $host = DatabaseHost::factory()->create();

    /** @var Database $db */
    $db = Database::factory()->create(['database_host_id' => $host->id, 'server_id' => $server->id]);

    $server->refresh();

    $this->daemonServerRepository->expects('setServer->delete')->withNoArgs()->andReturnUndefined();
    $this->databaseManagementService->expects('delete')->with(Mockery::on(function ($value) use ($db) {
        return $value instanceof Database && $value->id === $db->id;
    }))->andThrows(new Exception());

    expect(fn () => app(ServerDeletionService::class)->handle($server))
        ->toThrow(Exception::class);

    $this->assertDatabaseHas('servers', ['id' => $server->id]);
    $this->assertDatabaseHas('databases', ['id' => $db->id]);
});

test('exception while deleting databases does not abort if force deleted', function () {
    $server = $this->createServerModel();
    $host = DatabaseHost::factory()->create();

    /** @var Database $db */
    $db = Database::factory()->create(['database_host_id' => $host->id, 'server_id' => $server->id]);

    $server->refresh();

    $this->daemonServerRepository->expects('setServer->delete')->withNoArgs()->andReturnUndefined();
    $this->databaseManagementService->expects('delete')->with(Mockery::on(function ($value) use ($db) {
        return $value instanceof Database && $value->id === $db->id;
    }))->andThrows(new Exception());

    app(ServerDeletionService::class)->withForce(true)->handle($server);

    $this->assertDatabaseMissing('servers', ['id' => $server->id]);
    $this->assertDatabaseMissing('databases', ['id' => $db->id]);
});
