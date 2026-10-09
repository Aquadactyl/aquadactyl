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

    expect($task->action)->toBe('command')
        ->and($task->payload)->toBe('say Test')
        ->and($task->time_offset)->toBe(10);
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

    expect($task->action)->toBe('power')
        ->and($task->payload)->toBe('start');
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
