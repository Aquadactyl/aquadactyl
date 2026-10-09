<?php

use Pterodactyl\Models\Task;
use Illuminate\Http\Response;
use Pterodactyl\Models\Schedule;
use Pterodactyl\Models\Permission;

test('schedule can be deleted', function (array $permissions) {
    [$user, $server] = $this->generateTestAccount($permissions);

    $schedule = Schedule::factory()->create(['server_id' => $server->id]);
    $task = Task::factory()->create(['schedule_id' => $schedule->id]);

    $this->actingAs($user)
        ->deleteJson("/api/client/servers/$server->uuid/schedules/$schedule->id")
        ->assertStatus(Response::HTTP_NO_CONTENT);

    $this->assertDatabaseMissing('schedules', ['id' => $schedule->id]);
    $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
})->with([
    [[]],
    [[Permission::ACTION_SCHEDULE_DELETE]],
]);

test('not found error is returned if schedule does not exist at all', function () {
    [$user, $server] = $this->generateTestAccount();

    $this->actingAs($user)
        ->deleteJson("/api/client/servers/$server->uuid/schedules/123456789")
        ->assertStatus(Response::HTTP_NOT_FOUND);
});

test('not found error is returned if schedule does not belong to server', function () {
    [$user, $server] = $this->generateTestAccount();
    $server2 = $this->createServerModel(['owner_id' => $user->id]);

    $schedule = Schedule::factory()->create(['server_id' => $server2->id]);

    $this->actingAs($user)
        ->deleteJson("/api/client/servers/$server->uuid/schedules/$schedule->id")
        ->assertStatus(Response::HTTP_NOT_FOUND);

    $this->assertDatabaseHas('schedules', ['id' => $schedule->id]);
});

test('error is returned if subuser does not have required permissions', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_SCHEDULE_UPDATE]);

    $schedule = Schedule::factory()->create(['server_id' => $server->id]);

    $this->actingAs($user)
        ->deleteJson("/api/client/servers/$server->uuid/schedules/$schedule->id")
        ->assertStatus(Response::HTTP_FORBIDDEN);

    $this->assertDatabaseHas('schedules', ['id' => $schedule->id]);
});
