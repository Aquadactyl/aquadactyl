<?php

use Pterodactyl\Models\Task;
use Pterodactyl\Models\User;
use Pterodactyl\Models\ApiKey;
use Pterodactyl\Models\Session;
use Pterodactyl\Models\Subuser;
use Pterodactyl\Models\Database;
use Pterodactyl\Models\Schedule;
use Pterodactyl\Models\DatabaseHost;
use Pterodactyl\Repositories\Eloquent\EggRepository;
use Pterodactyl\Repositories\Eloquent\NestRepository;
use Pterodactyl\Repositories\Eloquent\TaskRepository;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Repositories\Eloquent\ApiKeyRepository;
use Pterodactyl\Repositories\Eloquent\SessionRepository;
use Pterodactyl\Repositories\Eloquent\SubuserRepository;
use Pterodactyl\Repositories\Eloquent\DatabaseRepository;
use Pterodactyl\Repositories\Eloquent\ScheduleRepository;
use Pterodactyl\Exceptions\Repository\RecordNotFoundException;

uses(DatabaseTransactions::class);

test('egg and nest loaders expose copy sources variables and resource counts', function () {
    $server = $this->createServerModel();
    $eggs = app(EggRepository::class);
    expect($eggs->getWithVariables($server->egg_id)->variables)->not->toBeEmpty();
    expect($eggs->getAllWithCopyAttributes()->first()->relationLoaded('scriptFrom'))->toBeTrue();
    expect($eggs->getWithCopyAttributes($server->egg->uuid, 'uuid')->id)->toBe($server->egg_id);
    $nests = app(NestRepository::class);
    expect($nests->getWithEggs($server->nest_id)->eggs->pluck('id'))->toContain($server->egg_id);
    expect($nests->getWithCounts($server->nest_id)->servers_count)->toBeGreaterThanOrEqual(1);
    expect($nests->getWithCounts()->firstWhere('id', $server->nest_id)->eggs_count)->toBeGreaterThanOrEqual(1);
    expect($nests->getWithEggServers($server->nest_id)->eggs->firstWhere('id', $server->egg_id)->servers->pluck('id'))->toContain($server->id);
});

test('missing eggs and nests consistently raise repository lookup errors', function (string $repository, string $method) {
    expect(fn () => app($repository)->{$method}(PHP_INT_MAX))->toThrow(RecordNotFoundException::class);
})->with([[EggRepository::class, 'getWithVariables'], [EggRepository::class, 'getWithCopyAttributes'], [EggRepository::class, 'getWithExportAttributes'], [NestRepository::class, 'getWithEggs'], [NestRepository::class, 'getWithCounts'], [NestRepository::class, 'getWithEggServers']]);

test('task repositories choose the next sequence only within the requested schedule', function () {
    $server = $this->createServerModel();
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);
    $first = Task::factory()->create(['schedule_id' => $schedule->id, 'sequence_id' => 1]);
    $next = Task::factory()->create(['schedule_id' => $schedule->id, 'sequence_id' => 4]);
    $tasks = app(TaskRepository::class);
    expect($tasks->getTaskForJobProcess($first->id)->server->user->id)->toBe($server->owner_id);
    expect($tasks->getNextTask($schedule->id, 1)->id)->toBe($next->id)->and($tasks->getNextTask($schedule->id, 4))->toBeNull();
    expect(app(ScheduleRepository::class)->findServerSchedules($server->id)->firstWhere('id', $schedule->id)->tasks_count)->toBe(2);
    expect(app(ScheduleRepository::class)->getScheduleWithTasks($schedule->id)->tasks->pluck('id'))->toContain($first->id, $next->id);
    expect(fn () => $tasks->getTaskForJobProcess(PHP_INT_MAX))->toThrow(RecordNotFoundException::class);
    expect(fn () => app(ScheduleRepository::class)->getScheduleWithTasks(PHP_INT_MAX))->toThrow(RecordNotFoundException::class);
});

test('database lists keep server and host boundaries and include their related resources', function () {
    $server = $this->createServerModel();
    $other = $this->createServerModel();
    $host = DatabaseHost::factory()->create();
    $database = Database::factory()->create(['database_host_id' => $host->id, 'server_id' => $server->id]);
    Database::factory()->create(['database_host_id' => DatabaseHost::factory()->create()->id, 'server_id' => $other->id]);
    $repository = app(DatabaseRepository::class);
    expect($repository->getDatabasesForServer($server->id)->pluck('id')->all())->toBe([$database->id]);
    expect($repository->getDatabasesForHost($host->id, 1)->items()[0]->server->id)->toBe($server->id);
});

test('account key deletion cannot remove another users keys or application credentials', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $key = ApiKey::factory()->create(['user_id' => $user->id, 'key_type' => ApiKey::TYPE_ACCOUNT]);
    $appKey = ApiKey::factory()->create(['user_id' => $user->id, 'key_type' => ApiKey::TYPE_APPLICATION]);
    $otherKey = ApiKey::factory()->create(['user_id' => $other->id, 'key_type' => ApiKey::TYPE_ACCOUNT]);
    $repository = app(ApiKeyRepository::class);
    expect($repository->getAccountKeys($user)->pluck('id')->all())->toBe([$key->id]);
    expect($repository->deleteAccountKey($user, $otherKey->identifier))->toBe(0)->and($repository->deleteAccountKey($user, $appKey->identifier))->toBe(0);
    expect($repository->deleteAccountKey($user, $key->identifier))->toBe(1);
});

test('session revocation is restricted to the requested account', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    Session::query()->insert(['id' => 'coverage-session', 'user_id' => $user->id, 'payload' => 'payload', 'last_activity' => time()]);
    $repository = app(SessionRepository::class);
    expect($repository->getUserSessions($user->id)->pluck('id')->all())->toBe(['coverage-session']);
    expect($repository->deleteUserSession($other->id, 'coverage-session'))->toBe(0)->and($repository->deleteUserSession($user->id, 'coverage-session'))->toBe(1);
});

test('subuser repositories load related accounts refresh changes and retain JSON permissions', function () {
    [$user, $server] = $this->generateTestAccount(['control.console']);
    $subuser = Subuser::where('user_id', $user->id)->where('server_id', $server->id)->firstOrFail();
    $repository = app(SubuserRepository::class);
    $loaded = $repository->loadServerAndUserRelations($subuser);
    expect($loaded->server->id)->toBe($server->id)->and($loaded->user->id)->toBe($user->id);
    $user->update(['name_first' => 'Refreshed']);
    expect($repository->loadServerAndUserRelations($loaded, true)->user->name_first)->toBe('Refreshed');
    expect($repository->loadServerAndUserRelations($loaded)->id)->toBe($subuser->id);
    expect($repository->getWithPermissions($subuser)->permissions)->toBe(['control.console']);
    expect($repository->getWithPermissions($subuser, true)->user->id)->toBe($user->id);
    expect($repository->getWithPermissionsUsingUserAndServer($user->id, $server->id)->permissions)->toBe(['control.console']);
    expect(fn () => $repository->getWithPermissionsUsingUserAndServer($user->id, PHP_INT_MAX))->toThrow(RecordNotFoundException::class);
    expect($subuser->hashid)->toBe(app('hashids')->encode($subuser->id));
});
