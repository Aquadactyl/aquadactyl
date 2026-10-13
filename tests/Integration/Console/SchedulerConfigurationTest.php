<?php

use Pterodactyl\Console\Kernel;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Console\BlueprintConsoleLibrary;

uses(DatabaseTransactions::class);

beforeEach(function () {
    $this->installedMarker = base_path('.blueprint/extensions/blueprint/private/db/is_installed');
    $this->markerContents = is_file($this->installedMarker) ? file_get_contents($this->installedMarker) : null;
    $this->scheduleFixture = app_path('BlueprintFramework/Schedules/coverage-schedule.php');
});

afterEach(function () {
    if (is_file($this->scheduleFixture)) {
        unlink($this->scheduleFixture);
    }
    if ($this->markerContents === null) {
        if (is_file($this->installedMarker)) {
            unlink($this->installedMarker);
        }
    } else {
        file_put_contents($this->installedMarker, $this->markerContents);
    }
});

test('a fresh installation schedules essential maintenance without requiring Blueprint database setup', function () {
    if (is_file($this->installedMarker)) {
        unlink($this->installedMarker);
    }
    config()->set(['backups.prune_age' => 0, 'activity.prune_days' => null, 'aquadactyl.telemetry.enabled' => false]);
    $events = app(Kernel::class)->resolveConsoleSchedule()->events();
    expect($events)->toHaveCount(4);
    expect(array_column($events, 'command'))->toContain("'/usr/local/bin/php' 'artisan' p:maintenance:prune-file-trash");
    expect(array_filter($events, fn ($event) => $event->description && str_contains($event->description, 'Telemetry')))->toBeEmpty();
});

test('installed panels schedule opted-in telemetry pruning and extension jobs', function (bool $telemetry) {
    if (!is_dir(dirname($this->installedMarker))) {
        mkdir(dirname($this->installedMarker), 0755, true);
    }
    file_put_contents($this->installedMarker, 'installed');
    file_put_contents($this->scheduleFixture, '<?php $schedule->command("coverage:extension-job")->hourly();');
    config()->set(['backups.prune_age' => 60, 'activity.prune_days' => 30, 'aquadactyl.telemetry.enabled' => $telemetry ? 'true' : 'false']);
    $library = app(BlueprintConsoleLibrary::class);
    $library->dbSet('blueprint', 'flags:telemetry_enabled', $telemetry);
    $library->dbSet('blueprint', 'internal:uuid', null);
    $events = app(Kernel::class)->resolveConsoleSchedule()->events();
    $names = array_filter(array_column($events, 'description'));
    expect(in_array('Collect Blueprint Telemetry', $names))->toBe($telemetry)->and(in_array('Collect Aquadactyl Telemetry', $names))->toBe($telemetry);
    expect(count(array_filter($events, fn ($event) => str_contains($event->command ?? '', 'coverage:extension-job'))))->toBe(1);
    $metadata = array_values(array_filter($events, fn ($event) => str_contains($event->command ?? '', 'bp:meta')))[0];
    expect($metadata->withoutOverlapping)->toBeTrue();
    if ($telemetry) {
        $uuid = $library->dbGet('blueprint', 'internal:uuid');
        expect($uuid)->toMatch('/^[a-f0-9-]{36}$/');
        app(Kernel::class)->resolveConsoleSchedule();
        expect($library->dbGet('blueprint', 'internal:uuid'))->toBe($uuid);
    }
})->with([true, false]);
