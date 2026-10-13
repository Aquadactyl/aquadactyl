<?php

use Pterodactyl\Models\Server;
use Pterodactyl\Services\Servers\SuspensionService;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;

beforeEach(function () {
    $this->repository = Mockery::mock(DaemonServerRepository::class);
    $this->app->instance(DaemonServerRepository::class, $this->repository);
});

test('server is suspended and unsuspended', function () {
    $server = $this->createServerModel();

    $this->repository->expects('setServer->sync')->twice()->andReturnSelf();

    app(SuspensionService::class)->toggle($server);

    expect($server->refresh()->isSuspended())->toBeTrue();

    app(SuspensionService::class)->toggle($server, SuspensionService::ACTION_UNSUSPEND);

    expect($server->refresh()->isSuspended())->toBeFalse();
});

test('no action is taken if suspension status is unchanged', function () {
    $server = $this->createServerModel();

    app(SuspensionService::class)->toggle($server, SuspensionService::ACTION_UNSUSPEND);

    $server->refresh();
    expect($server->isSuspended())->toBeFalse();

    $server->update(['status' => Server::STATUS_SUSPENDED]);
    app(SuspensionService::class)->toggle($server);

    $server->refresh();
    expect($server->isSuspended())->toBeTrue();
});

test('exception is thrown if invalid actions are passed', function () {
    $server = $this->createServerModel();

    $this->expectException(InvalidArgumentException::class);
    $this->expectExceptionMessage('Expected one of: "suspend", "unsuspend". Got: "foo"');

    app(SuspensionService::class)->toggle($server, 'foo');
});

test('failed Wings synchronization restores the previous suspension status', function (bool $suspended) {
    $server = $this->createServerModel(['status' => $suspended ? Server::STATUS_SUSPENDED : null]);
    $this->repository->expects('setServer')->with($server)->andReturnSelf();
    $this->repository->expects('sync')->andThrow(new RuntimeException('Wings unavailable'));
    expect(fn () => app(SuspensionService::class)->toggle($server, $suspended ? SuspensionService::ACTION_UNSUSPEND : SuspensionService::ACTION_SUSPEND))->toThrow(RuntimeException::class, 'Wings unavailable');
    expect($server->refresh()->isSuspended())->toBe($suspended);
})->with([true, false]);

test('servers in an active transfer cannot change suspension status', function () {
    $server = $this->createServerModel();
    $server->setRelation('transfer', new Pterodactyl\Models\ServerTransfer());
    $this->repository->shouldNotReceive('setServer');
    expect(fn () => app(SuspensionService::class)->toggle($server))->toThrow(Symfony\Component\HttpKernel\Exception\ConflictHttpException::class);
    expect($server->refresh()->isSuspended())->toBeFalse();
});
