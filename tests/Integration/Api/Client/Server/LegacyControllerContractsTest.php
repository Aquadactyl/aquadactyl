<?php

use Illuminate\Http\Request;
use Pterodactyl\Models\Task;
use Illuminate\Routing\Route;
use Pterodactyl\Models\Backup;
use Pterodactyl\Models\Schedule;
use Pterodactyl\Models\Permission;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Pterodactyl\Http\Controllers\Api\Client\Servers\BackupController;
use Pterodactyl\Http\Controllers\Api\Client\Servers\ScheduleController;
use Pterodactyl\Http\Controllers\Api\Client\Servers\ScheduleTaskController;
use Pterodactyl\Http\Requests\Api\Client\Servers\Schedules\StoreTaskRequest;
use Pterodactyl\Http\Requests\Api\Client\Servers\Schedules\ViewScheduleRequest;

uses(DatabaseTransactions::class);

test('backup controllers independently enforce read and deletion permissions for extension callers', function (string $method) {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_CONTROL_CONSOLE]);
    $request = Request::create('/contract');
    $request->setUserResolver(fn () => $user);
    $backup = Backup::factory()->create(['server_id' => $server->id]);
    expect(fn () => app(BackupController::class)->{$method}($request, $server, $backup))->toThrow(Illuminate\Auth\Access\AuthorizationException::class);
})->with(['index', 'toggleLock', 'delete']);

test('backup downloads reject unknown storage drivers and restores reject servers that are busy', function (bool $download) {
    [$user, $server] = $this->generateTestAccount();
    $backup = Backup::factory()->create(['server_id' => $server->id]);
    $request = new Pterodactyl\Http\Requests\Api\Client\Servers\Backups\RestoreBackupRequest();
    $request->setUserResolver(fn () => $user);
    if ($download) {
        $backup->disk = 'unknown';
    } else {
        $server->status = Pterodactyl\Models\Server::STATUS_RESTORING_BACKUP;
    }
    expect(fn () => app(BackupController::class)->{$download ? 'download' : 'restore'}($request, $server, $backup))->toThrow(Symfony\Component\HttpKernel\Exception\BadRequestHttpException::class);
})->with([true, false]);

test('legacy schedule calls clamp invalid sequence values while preserving task order', function () {
    [$user, $server] = $this->generateTestAccount();
    $this->actingAs($user);
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);
    $request = StoreTaskRequest::create('/contract', 'POST', ['action' => 'command', 'payload' => 'say test', 'time_offset' => 0, 'sequence_id' => 0]);
    $request->setUserResolver(fn () => $user);
    app()->instance('request', $request);
    $controller = app(ScheduleTaskController::class);
    $result = $controller->store($request, $server, $schedule);
    $task = Task::findOrFail($result['attributes']['id']);
    expect($task->sequence_id)->toBe(1);
    $result = $controller->update($request, $server, $schedule, $task);
    expect($result['attributes']['sequence_id'])->toBe(1);
});

test('legacy schedule controllers reject mismatched tasks and schedules before modifying any data', function (string $method) {
    [$user, $server] = $this->generateTestAccount();
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);
    $task = Task::factory()->create(['schedule_id' => $schedule->id]);
    $unrelated = Schedule::factory()->create(['server_id' => $server->id]);
    $request = new StoreTaskRequest();
    if ($method === 'view') {
        $schedule->server_id = PHP_INT_MAX;
        expect(fn () => app(ScheduleController::class)->view($request, $server, $schedule))->toThrow(NotFoundHttpException::class);
    } else {
        expect(fn () => app(ScheduleTaskController::class)->{$method}($request, $server, $unrelated, $task))->toThrow(NotFoundHttpException::class);
    }
    $this->assertDatabaseHas('tasks', ['id' => $task->id, 'schedule_id' => $task->schedule_id]);
})->with(['update', 'delete', 'view']);

test('invalid cron expressions remain recoverable for legacy extension callers', function () {
    $server = $this->createServerModel();
    $request = Pterodactyl\Http\Requests\Api\Client\Servers\Schedules\StoreScheduleRequest::create('/contract', 'POST', ['minute' => 'invalid', 'hour' => '*', 'day_of_month' => '*', 'month' => '*', 'day_of_week' => '*']);
    expect(fn () => app(ScheduleController::class)->store($request, $server))->toThrow(Pterodactyl\Exceptions\DisplayException::class, 'valid expression');
});

test('schedule forms reject unrelated route resources and file-download forms preserve ownership checks', function () {
    [$user, $server] = $this->generateTestAccount();
    $request = new ViewScheduleRequest();
    $route = new Route('GET', '/contract', fn () => null);
    $route->bind(Request::create('/contract'));
    $route->setParameter('server', $server);
    $route->setParameter('schedule', Schedule::factory()->make(['server_id' => PHP_INT_MAX]));
    $request->setUserResolver(fn () => $user);
    $request->setRouteResolver(fn () => $route);
    expect(fn () => $request->authorize())->toThrow(NotFoundHttpException::class);
    $download = new Pterodactyl\Http\Requests\Api\Client\Servers\Files\DownloadFileRequest();
    $download->setRouteResolver(fn () => $route);
    $download->setUserResolver(fn () => $user);
    expect($download->authorize())->toBeTrue();
});

test('subuser lists include only users belonging to the requested server', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_USER_READ]);
    $this->actingAs($server->user)->getJson($this->link($server, 'users'))->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.attributes.uuid', $user->uuid);
});

test('realtime lookups do not authenticate malformed API tokens and transferring servers reject a second transfer', function () {
    expect(Pterodactyl\Models\ApiKey::findToken('missing-token'))->toBeNull();
    $server = $this->createServerModel(['status' => Pterodactyl\Models\Server::STATUS_INSTALLING]);
    expect(fn () => $server->validateTransferState())->toThrow(Pterodactyl\Exceptions\Http\Server\ServerStateConflictException::class);
});

test('Wings cannot complete or fail a transfer that is not active', function (string $method) {
    $server = $this->createServerModel();
    expect(fn () => app(Pterodactyl\Http\Controllers\Api\Remote\Servers\ServerTransferController::class)->{$method}(Request::create('/transfer'), $server->uuid))->toThrow(Symfony\Component\HttpKernel\Exception\ConflictHttpException::class, 'not being transferred');
})->with(['success', 'failure']);

test('legacy account password changes revoke other browser sessions', function () {
    $user = Pterodactyl\Models\User::factory()->create();
    $this->actingAs($user);
    $request = Pterodactyl\Http\Requests\Api\Client\Account\UpdatePasswordRequest::create('/password', 'PUT', ['password' => 'ChangedTesting123!', 'password_confirmation' => 'ChangedTesting123!']);
    $request->setUserResolver(fn () => $user);
    $request->setValidator(Illuminate\Support\Facades\Validator::make($request->all(), $request->rules()));
    $guard = Mockery::mock(Illuminate\Auth\SessionGuard::class);
    $guard->expects('setUser')->with($user);
    $guard->expects('logoutOtherDevices')->with('ChangedTesting123!');
    $manager = Mockery::mock(Illuminate\Auth\AuthManager::class);
    $manager->expects('guard')->andReturn($guard);
    $service = $this->mock(Pterodactyl\Services\Users\UserUpdateService::class);
    $service->expects('handle')->andReturn($user);
    $controller = new Pterodactyl\Http\Controllers\Api\Client\AccountController($manager, $service);
    expect($controller->updatePassword($request)->getStatusCode())->toBe(204);
});

test('subuser creation cannot add the existing server owner as a subuser', function () {
    $server = $this->createServerModel();
    expect(fn () => app(Pterodactyl\Services\Subusers\SubuserCreationService::class)->handle($server, $server->user->email, ['control.console']))->toThrow(Pterodactyl\Exceptions\Service\Subuser\UserIsServerOwnerException::class);
});
