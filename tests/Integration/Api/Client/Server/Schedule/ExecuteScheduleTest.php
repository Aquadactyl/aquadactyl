<?php

use Pterodactyl\Models\Task;
use Illuminate\Http\Response;
use Pterodactyl\Models\Schedule;
use Pterodactyl\Models\Permission;
use Illuminate\Support\Facades\Bus;
use Pterodactyl\Jobs\Schedule\RunTaskJob;

test('schedule is executed right away', function (array $permissions) {
    [$user, $server] = $this->generateTestAccount($permissions);

    Bus::fake();

    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create([
        'server_id' => $server->id,
    ]);

    $response = $this->actingAs($user)->postJson($this->link($schedule, '/execute'));
    $response->assertStatus(Response::HTTP_BAD_REQUEST);
    $response->assertJsonPath('errors.0.code', 'DisplayException');
    $response->assertJsonPath('errors.0.detail', 'Cannot process schedule for task execution: no tasks are registered.');

    /** @var Task $task */
    $task = Task::factory()->create([
        'schedule_id' => $schedule->id,
        'sequence_id' => 1,
        'time_offset' => 2,
    ]);

    $this->actingAs($user)->postJson($this->link($schedule, '/execute'))->assertStatus(Response::HTTP_ACCEPTED);

    Bus::assertDispatched(function (RunTaskJob $job) use ($task) {
        // A task executed right now should not have any job delay associated with it.
        $this->assertNull($job->delay);
        $this->assertSame($task->id, $job->task->id);

        return true;
    });
})->with([
    [[]],
    [[Permission::ACTION_SCHEDULE_UPDATE]],
]);

test('user without schedule update permission cannot execute', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_SCHEDULE_CREATE]);

    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);

    $this->actingAs($user)->postJson($this->link($schedule, '/execute'))->assertForbidden();
});

test('subuser can execute schedule without task action permission', function (string $action, string $payload) {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_SCHEDULE_UPDATE]);

    Bus::fake();

    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);

    /** @var Task $task */
    $task = Task::factory()->create([
        'schedule_id' => $schedule->id,
        'sequence_id' => 1,
        'action' => $action,
        'payload' => $payload,
    ]);

    $this->actingAs($user)->postJson($this->link($schedule, '/execute'))->assertStatus(Response::HTTP_ACCEPTED);

    Bus::assertDispatched(fn (RunTaskJob $job) => $job->task->id === $task->id);
})->with([
    ['command', 'say Test'],
    ['power', 'start'],
    ['power', 'stop'],
    ['power', 'restart'],
    ['power', 'kill'],
    ['backup', ''],
]);

test('owner can execute schedule with unmappable task payload', function () {
    [$user, $server] = $this->generateTestAccount();

    Bus::fake();

    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);

    /** @var Task $task */
    $task = Task::factory()->create([
        'schedule_id' => $schedule->id,
        'sequence_id' => 1,
        'action' => 'power',
        'payload' => 'reboot',
    ]);

    $this->actingAs($user)->postJson($this->link($schedule, '/execute'))->assertStatus(Response::HTTP_ACCEPTED);

    Bus::assertDispatched(fn (RunTaskJob $job) => $job->task->id === $task->id);
});
