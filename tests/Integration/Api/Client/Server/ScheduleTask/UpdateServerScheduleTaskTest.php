<?php

use Pterodactyl\Models\Task;
use Illuminate\Http\Response;
use Pterodactyl\Models\Schedule;
use Pterodactyl\Models\Permission;

test('task can be updated', function () {
    [$user, $server] = $this->generateTestAccount([
        Permission::ACTION_SCHEDULE_UPDATE,
        Permission::ACTION_CONTROL_CONSOLE,
    ]);

    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);
    /** @var Task $task */
    $task = Task::factory()->create([
        'schedule_id' => $schedule->id,
        'action' => 'power',
        'payload' => 'start',
    ]);

    $response = $this->actingAs($user)->postJson($this->link($task), [
        'action' => 'command',
        'payload' => 'say Test',
        'time_offset' => 10,
    ]);

    $response->assertOk();
    $task->refresh();

    $this->assertSame('command', $task->action);
    $this->assertSame('say Test', $task->payload);
    $this->assertSame(10, $task->time_offset);
});

test('task cannot be updated without action permission', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_SCHEDULE_UPDATE]);

    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);
    /** @var Task $task */
    $task = Task::factory()->create([
        'schedule_id' => $schedule->id,
        'action' => 'power',
        'payload' => 'start',
    ]);

    $this->actingAs($user)->postJson($this->link($task), [
        'action' => 'command',
        'payload' => 'say Test',
        'time_offset' => 10,
    ])->assertForbidden();

    $task->refresh();

    $this->assertSame('power', $task->action);
    $this->assertSame('start', $task->payload);
});

test('power task requires valid payload', function () {
    [$user, $server] = $this->generateTestAccount([
        Permission::ACTION_SCHEDULE_UPDATE,
        Permission::ACTION_CONTROL_START,
    ]);

    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);
    /** @var Task $task */
    $task = Task::factory()->create(['schedule_id' => $schedule->id]);

    $this->actingAs($user)->postJson($this->link($task), [
        'action' => 'power',
        'payload' => 'invalid',
        'time_offset' => 0,
    ])
        ->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonPath('errors.0.meta.rule', 'in')
        ->assertJsonPath('errors.0.meta.source_field', 'payload');
});
