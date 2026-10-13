<?php

use Pterodactyl\Models\Task;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Schedule;
use Illuminate\Support\Facades\Log;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Schedules\ProcessScheduleService;

uses(DatabaseTransactions::class);

test('schedule processor exits successfully when no eligible schedules exist', function () {
    Schedule::query()->delete();
    $this->artisan('p:schedule:process')->expectsOutput('There are no scheduled tasks for servers that need to be run.')->assertSuccessful();
});

test('schedule processor runs due active schedules and ignores ineligible or empty schedules', function () {
    Schedule::query()->delete();
    $server = $this->createServerModel();
    $eligible = Schedule::factory()->create(['server_id' => $server->id, 'is_active' => true, 'is_processing' => false, 'next_run_at' => now()->subMinute()]);
    Task::factory()->create(['schedule_id' => $eligible->id]);
    foreach ([['is_active' => false], ['is_processing' => true], ['next_run_at' => now()->addDay()]] as $attributes) {
        $schedule = Schedule::factory()->create($attributes + ['server_id' => $server->id, 'is_active' => true, 'is_processing' => false, 'next_run_at' => now()->subMinute()]);
        Task::factory()->create(['schedule_id' => $schedule->id]);
    }
    Schedule::factory()->create(['server_id' => $server->id, 'is_active' => true, 'is_processing' => false, 'next_run_at' => now()->subMinute()]);
    $suspended = $this->createServerModel(['status' => Server::STATUS_SUSPENDED]);
    $schedule = Schedule::factory()->create(['server_id' => $suspended->id, 'is_active' => true, 'is_processing' => false, 'next_run_at' => now()->subMinute()]);
    Task::factory()->create(['schedule_id' => $schedule->id]);
    $service = Mockery::mock(ProcessScheduleService::class);
    $service->shouldReceive('handle')->once()->with(Mockery::on(fn ($schedule) => $schedule->id === $eligible->id));
    $this->app->instance(ProcessScheduleService::class, $service);
    $this->artisan('p:schedule:process')->assertSuccessful();
});

test('one failed schedule is logged without preventing later schedules from processing', function () {
    Schedule::query()->delete();
    $server = $this->createServerModel();
    $schedules = Schedule::factory()->count(2)->create(['server_id' => $server->id, 'is_active' => true, 'is_processing' => false, 'next_run_at' => now()->subMinute()]);
    foreach ($schedules as $schedule) {
        Task::factory()->create(['schedule_id' => $schedule->id]);
    }
    $error = new RuntimeException('Wings unavailable');
    $service = Mockery::mock(ProcessScheduleService::class);
    $service->shouldReceive('handle')->once()->ordered()->with(Mockery::on(fn ($schedule) => $schedule->id === $schedules[0]->id))->andThrow($error);
    $service->shouldReceive('handle')->once()->ordered()->with(Mockery::on(fn ($schedule) => $schedule->id === $schedules[1]->id));
    $this->app->instance(ProcessScheduleService::class, $service);
    Log::shouldReceive('error')->once()->with($error, ['schedule_id' => $schedules[0]->id]);
    $this->artisan('p:schedule:process')->expectsOutput('An error was encountered while processing Schedule #' . $schedules[0]->id . ': Wings unavailable')->assertSuccessful();
});
