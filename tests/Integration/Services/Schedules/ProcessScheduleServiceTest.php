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
        ->toThrow(\InvalidArgumentException::class);

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
