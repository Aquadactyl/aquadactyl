<?php

use Pterodactyl\Models\Task;
use Pterodactyl\Models\Schedule;

test('inserting reordering and deleting tasks preserve the order of the other scheduled actions', function () {
    [$user, $server] = $this->generateTestAccount();
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);
    $first = Task::factory()->create(['schedule_id' => $schedule->id, 'sequence_id' => 1]);
    $second = Task::factory()->create(['schedule_id' => $schedule->id, 'sequence_id' => 2]);
    $base = $this->link($server, '/schedules/' . $schedule->id . '/tasks');
    $payload = ['action' => 'command', 'payload' => 'say testing', 'time_offset' => 5, 'sequence_id' => 1];
    $id = $this->actingAs($user)->postJson($base, $payload)->assertOk()->json('attributes.id');
    expect($first->fresh()->sequence_id)->toBe(2)->and($second->fresh()->sequence_id)->toBe(3);
    $this->postJson($base . '/' . $id, array_replace($payload, ['sequence_id' => 3]))->assertOk()->assertJsonPath('attributes.sequence_id', 3);
    expect($first->fresh()->sequence_id)->toBe(1)->and($second->fresh()->sequence_id)->toBe(2);
    $this->postJson($base . '/' . $id, $payload)->assertOk()->assertJsonPath('attributes.sequence_id', 1);
    expect($first->fresh()->sequence_id)->toBe(2)->and($second->fresh()->sequence_id)->toBe(3);
    $this->deleteJson($base . '/' . $id)->assertNoContent();
    expect($first->fresh()->sequence_id)->toBe(1)->and($second->fresh()->sequence_id)->toBe(2);
    $this->assertDatabaseMissing('tasks', ['id' => $id]);
});

test('servers without backup capacity cannot change a task to a backup action', function () {
    [$user, $server] = $this->generateTestAccount();
    $server->update(['backup_limit' => 0]);
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);
    $task = Task::factory()->create(['schedule_id' => $schedule->id]);
    $this->actingAs($user)->postJson($this->link($server, '/schedules/' . $schedule->id . '/tasks/' . $task->id), ['action' => 'backup', 'time_offset' => 0])->assertForbidden();
});
