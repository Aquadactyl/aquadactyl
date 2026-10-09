<?php

use Pterodactyl\Models\Schedule;
use Pterodactyl\Helpers\Utilities;
use Pterodactyl\Models\Permission;

$updateData = [
    'name' => 'Updated Schedule Name',
    'minute' => '5',
    'hour' => '*',
    'day_of_week' => '*',
    'month' => '*',
    'day_of_month' => '*',
    'is_active' => false,
];

test('schedule can be updated', function (array $permissions) use ($updateData) {
    [$user, $server] = $this->generateTestAccount($permissions);

    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create(['server_id' => $server->id]);
    $expected = Utilities::getScheduleNextRunDate('5', '*', '*', '*', '*');

    $response = $this->actingAs($user)
        ->postJson("/api/client/servers/{$server->uuid}/schedules/{$schedule->id}", $updateData);

    $schedule = $schedule->refresh();

    $response->assertOk();
    expect($schedule->name)->toBe('Updated Schedule Name')
        ->and($schedule->is_active)->toBeFalse();
    $this->assertJsonTransformedWith($response->json('attributes'), $schedule);

    expect($schedule->next_run_at->toAtomString())->toBe($expected->toAtomString());
})->with([
    [[]],
    [[Permission::ACTION_SCHEDULE_UPDATE]],
]);

test('error is returned if schedule does not belong to server', function () {
    [$user, $server] = $this->generateTestAccount();
    $server2 = $this->createServerModel(['owner_id' => $user->id]);

    $schedule = Schedule::factory()->create(['server_id' => $server2->id]);

    $this->actingAs($user)
        ->postJson("/api/client/servers/{$server->uuid}/schedules/{$schedule->id}")
        ->assertNotFound();
});

test('error is returned if subuser does not have permission to modify schedule', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_SCHEDULE_CREATE]);

    $schedule = Schedule::factory()->create(['server_id' => $server->id]);

    $this->actingAs($user)
        ->postJson("/api/client/servers/{$server->uuid}/schedules/{$schedule->id}")
        ->assertForbidden();
});

test('schedule is processing is set to false when active state changes', function () use ($updateData) {
    [$user, $server] = $this->generateTestAccount();

    /** @var Schedule $schedule */
    $schedule = Schedule::factory()->create([
        'server_id' => $server->id,
        'is_active' => true,
        'is_processing' => true,
    ]);

    expect($schedule->is_active)->toBeTrue()
        ->and($schedule->is_processing)->toBeTrue();

    $response = $this->actingAs($user)
        ->postJson("/api/client/servers/{$server->uuid}/schedules/{$schedule->id}", $updateData);

    $schedule = $schedule->refresh();

    $response->assertOk();
    expect($schedule->is_active)->toBeFalse()
        ->and($schedule->is_processing)->toBeFalse();
});
