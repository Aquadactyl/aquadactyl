<?php

use Carbon\Carbon;
use Carbon\CarbonImmutable;
use GuzzleHttp\Psr7\Request;
use Pterodactyl\Models\Task;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Schedule;
use Illuminate\Support\Facades\Bus;
use Pterodactyl\Jobs\Schedule\RunTaskJob;
use GuzzleHttp\Exception\BadResponseException;
use Pterodactyl\Repositories\Wings\DaemonPowerRepository;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

test('inactive job is not run', function () {
    $server = $this->createServerModel();

    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create([
        'server_id' => $server->id,
        'is_processing' => true,
        'last_run_at' => null,
        'is_active' => false,
    ]);
    /** @var Task $task */
    $task = Task::factory()->create(['schedule_id' => $schedule->id, 'is_queued' => true]);

    $job = new RunTaskJob($task);

    Bus::dispatchSync($job);

    $task->refresh();
    $schedule->refresh();

    expect($task->is_queued)->toBeFalse()
        ->and($schedule->is_processing)->toBeFalse()
        ->and($schedule->is_active)->toBeFalse()
        ->and(CarbonImmutable::now()->isSameAs(\DateTimeInterface::ATOM, $schedule->last_run_at))->toBeTrue();
});

test('job with invalid action throws exception', function () {
    $server = $this->createServerModel();

    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);
    /** @var Task $task */
    $task = Task::factory()->create(['schedule_id' => $schedule->id, 'action' => 'foobar']);

    $job = new RunTaskJob($task);

    Bus::dispatchSync($job);
})->throws(\InvalidArgumentException::class, 'Invalid task action provided: foobar');

test('job is executed', function (bool $isManualRun) {
    $server = $this->createServerModel();

    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create([
        'server_id' => $server->id,
        'is_active' => !$isManualRun,
        'is_processing' => true,
        'last_run_at' => null,
    ]);
    /** @var Task $task */
    $task = Task::factory()->create([
        'schedule_id' => $schedule->id,
        'action' => Task::ACTION_POWER,
        'payload' => 'start',
        'is_queued' => true,
        'continue_on_failure' => false,
    ]);

    $mock = \Mockery::mock(DaemonPowerRepository::class);
    $this->instance(DaemonPowerRepository::class, $mock);

    $mock->expects('setServer')->with(\Mockery::on(function ($value) use ($server) {
        return $value instanceof Server && $value->id === $server->id;
    }))->andReturnSelf();
    $mock->expects('send')->with('start')->andReturn(new Response());

    Bus::dispatchSync(new RunTaskJob($task, $isManualRun));

    $task->refresh();
    $schedule->refresh();

    expect($task->is_queued)->toBeFalse()
        ->and($schedule->is_processing)->toBeFalse()
        ->and(CarbonImmutable::now()->isSameAs(\DateTimeInterface::ATOM, $schedule->last_run_at))->toBeTrue();
})->with([true, false]);

test('exception during run is handled correctly', function (bool $continueOnFailure) {
    $server = $this->createServerModel();

    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);
    /** @var Task $task */
    $task = Task::factory()->create([
        'schedule_id' => $schedule->id,
        'action' => Task::ACTION_POWER,
        'payload' => 'start',
        'continue_on_failure' => $continueOnFailure,
    ]);

    $mock = \Mockery::mock(DaemonPowerRepository::class);
    $this->instance(DaemonPowerRepository::class, $mock);

    $mock->expects('setServer->send')->andThrow(
        new DaemonConnectionException(new BadResponseException('Bad request', new Request('GET', '/test'), new Response()))
    );

    if (!$continueOnFailure) {
        $this->expectException(DaemonConnectionException::class);
    }

    Bus::dispatchSync(new RunTaskJob($task));

    if ($continueOnFailure) {
        $task->refresh();
        $schedule->refresh();

        expect($task->is_queued)->toBeFalse()
            ->and($schedule->is_processing)->toBeFalse()
            ->and(CarbonImmutable::now()->isSameAs(\DateTimeInterface::ATOM, $schedule->last_run_at))->toBeTrue();
    }
})->with([true, false]);

test('task is not run if server is suspended', function () {
    $server = $this->createServerModel([
        'status' => Server::STATUS_SUSPENDED,
    ]);

    $schedule = Schedule::factory()->for($server)->create([
        'last_run_at' => Carbon::now()->subHour(),
    ]);

    $task = Task::factory()->for($schedule)->create([
        'action' => Task::ACTION_POWER,
        'payload' => 'start',
    ]);

    Bus::dispatchSync(new RunTaskJob($task));

    $task->refresh();
    $schedule->refresh();

    expect($task->is_queued)->toBeFalse()
        ->and($schedule->is_processing)->toBeFalse()
        ->and(Carbon::now()->isSameAs(\DateTimeInterface::ATOM, $schedule->last_run_at))->toBeTrue();
});
