<?php

use Carbon\CarbonImmutable;
use Pterodactyl\Models\Task;
use Pterodactyl\Models\Schedule;
use Illuminate\Support\Facades\Bus;
use Illuminate\Contracts\Bus\Dispatcher;
use Pterodactyl\Jobs\Schedule\RunTaskJob;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Services\Schedules\ProcessScheduleService;

test('schedule with no tasks returns exception', function () {
    $server = $this->createServerModel();
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);

    $this->expectException(DisplayException::class);
    $this->expectExceptionMessage('Cannot process schedule for task execution: no tasks are registered.');

    app(ProcessScheduleService::class)->handle($schedule);
});

test('error during schedule data update does not persist changes', function () {
    $server = $this->createServerModel();

    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create([
        'server_id' => $server->id,
        'cron_minute' => 'hodor', // this will break the getNextRunDate() function.
    ]);

    /** @var Task $task */
    $task = Task::factory()->create(['schedule_id' => $schedule->id, 'sequence_id' => 1]);

    expect(fn () => app(ProcessScheduleService::class)->handle($schedule))
        ->toThrow(InvalidArgumentException::class);

    $this->assertDatabaseMissing('schedules', ['id' => $schedule->id, 'is_processing' => true]);
    $this->assertDatabaseMissing('tasks', ['id' => $task->id, 'is_queued' => true]);
});

test('job can be dispatched with expected initial delay', function (bool $now) {
    Bus::fake();

    $server = $this->createServerModel();

    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);

    /** @var Task $task */
    $task = Task::factory()->create(['schedule_id' => $schedule->id, 'time_offset' => 10, 'sequence_id' => 1]);

    app(ProcessScheduleService::class)->handle($schedule, $now);

    Bus::assertDispatched(RunTaskJob::class, function ($job) use ($now, $task) {
        expect($job)->toBeInstanceOf(RunTaskJob::class)
            ->and($job->task->id)->toBe($task->id)
            ->and($job->delay)->toBe($now ? null : 10);

        return true;
    });

    $this->assertDatabaseHas('schedules', ['id' => $schedule->id, 'is_processing' => true]);
    $this->assertDatabaseHas('tasks', ['id' => $task->id, 'is_queued' => true]);
})->with([
    [true],
    [false],
]);

test('first sequence task is found', function () {
    Bus::fake();

    $server = $this->createServerModel();
    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);

    /** @var Task $task */
    $task2 = Task::factory()->create(['schedule_id' => $schedule->id, 'sequence_id' => 4]);
    $task = Task::factory()->create(['schedule_id' => $schedule->id, 'sequence_id' => 2]);
    $task3 = Task::factory()->create(['schedule_id' => $schedule->id, 'sequence_id' => 3]);

    app(ProcessScheduleService::class)->handle($schedule);

    Bus::assertDispatched(RunTaskJob::class, function (RunTaskJob $job) use ($task) {
        return $task->id === $job->task->id;
    });

    $this->assertDatabaseHas('schedules', ['id' => $schedule->id, 'is_processing' => true]);
    $this->assertDatabaseHas('tasks', ['id' => $task->id, 'is_queued' => true]);
    $this->assertDatabaseHas('tasks', ['id' => $task2->id, 'is_queued' => false]);
    $this->assertDatabaseHas('tasks', ['id' => $task3->id, 'is_queued' => false]);
});

test('task dispatched now is reset properly if error is encountered', function () {
    $this->swap(Dispatcher::class, $dispatcher = Mockery::mock(Dispatcher::class));

    $server = $this->createServerModel();
    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create(['server_id' => $server->id, 'last_run_at' => null]);
    /** @var Task $task */
    $task = Task::factory()->create(['schedule_id' => $schedule->id, 'sequence_id' => 1]);

    $dispatcher->expects('dispatchNow')->andThrows(new Exception('Test thrown exception'));

    expect(fn () => app(ProcessScheduleService::class)->handle($schedule, true))
        ->toThrow(Exception::class, 'Test thrown exception');

    $this->assertDatabaseHas('schedules', [
        'id' => $schedule->id,
        'is_processing' => false,
        'last_run_at' => CarbonImmutable::now()->toAtomString(),
    ]);

    $this->assertDatabaseHas('tasks', ['id' => $task->id, 'is_queued' => false]);
});

test('online-only schedules dispatch only while a server is running or starting', function (string $state) {
    Bus::fake();
    $server = $this->createServerModel();
    $schedule = Schedule::factory()->create(['server_id' => $server->id, 'only_when_online' => true]);
    $task = Task::factory()->create(['schedule_id' => $schedule->id, 'sequence_id' => 1]);
    $this->mock(Pterodactyl\Repositories\Wings\DaemonServerRepository::class)->shouldReceive('setServer')->once()->andReturnSelf()->shouldReceive('getDetails')->once()->andReturn($state === 'unknown' ? [] : ['state' => $state]);
    app(ProcessScheduleService::class)->handle($schedule);
    if (in_array($state, ['running', 'starting'])) {
        Bus::assertDispatched(RunTaskJob::class);
    } else {
        Bus::assertNothingDispatched();
        expect($task->fresh()->is_queued)->toBeFalse()->and($schedule->fresh()->is_processing)->toBeFalse();
    }
})->with(['running', 'starting', 'offline', 'stopping', 'unknown']);

test('online-only schedules reset queued work when Wings cannot provide its state', function (bool $connectionFailure) {
    Bus::fake();
    $server = $this->createServerModel();
    $schedule = Schedule::factory()->create(['server_id' => $server->id, 'only_when_online' => true]);
    $task = Task::factory()->create(['schedule_id' => $schedule->id, 'sequence_id' => 1]);
    $exception = $connectionFailure ? new Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException(new GuzzleHttp\Exception\ConnectException('offline', new GuzzleHttp\Psr7\Request('GET', 'http://wings.invalid'))) : new RuntimeException('invalid daemon state');
    $this->mock(Pterodactyl\Repositories\Wings\DaemonServerRepository::class)->shouldReceive('setServer')->once()->andReturnSelf()->shouldReceive('getDetails')->once()->andThrow($exception);
    app(ProcessScheduleService::class)->handle($schedule);
    Bus::assertNothingDispatched();
    expect($task->fresh()->is_queued)->toBeFalse()->and($schedule->fresh()->is_processing)->toBeFalse();
})->with([true, false]);
