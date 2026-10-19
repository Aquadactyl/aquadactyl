<?php

namespace Pterodactyl\Console;

use Pterodactyl\Models\ActivityLog;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Database\Console\PruneCommand;
use Pterodactyl\BlueprintFramework\GetExtensionSchedules;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;
use Pterodactyl\Services\Telemetry\RegisterBlueprintTelemetry;
use Pterodactyl\Console\Commands\Schedule\ProcessRunnableCommand;
use Pterodactyl\Services\Telemetry\AquadactylTelemetryCollectionService;
// Import Blueprint schedules, telemetry and library
use Pterodactyl\Console\Commands\Maintenance\PruneOrphanedBackupsCommand;
use Pterodactyl\Console\Commands\Maintenance\CleanServiceBackupFilesCommand;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Console\BlueprintConsoleLibrary as BlueprintExtensionLibrary;

class Kernel extends ConsoleKernel
{
    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__ . '/Commands');
    }

    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // https://laravel.com/docs/10.x/upgrade#redis-cache-tags
        $schedule->command('cache:prune-stale-tags')->hourly();
        $schedule->command('p:subdomains:sync')->everyFiveMinutes()->withoutOverlapping();

        // Execute scheduled commands for servers every minute, as if there was a normal cron running.
        $schedule->command(ProcessRunnableCommand::class)->everyMinute()->withoutOverlapping();
        $schedule->command(CleanServiceBackupFilesCommand::class)->daily();
        // Existing expiry dates still apply if administrators disable new trash use.
        $schedule->command('p:maintenance:prune-file-trash')->everyFifteenMinutes()->withoutOverlapping();

        if (config('backups.prune_age')) {
            // Every 30 minutes, run the backup pruning command so that any abandoned backups can be deleted.
            $schedule->command(PruneOrphanedBackupsCommand::class)->everyThirtyMinutes();
        }

        if (config('activity.prune_days')) {
            $schedule->command(PruneCommand::class, ['--model' => [ActivityLog::class]])->daily();
        }

        if (filter_var(config('aquadactyl.telemetry.enabled', false), FILTER_VALIDATE_BOOLEAN)) {
            $schedule->call(app()->make(AquadactylTelemetryCollectionService::class))
                ->description('Collect Aquadactyl Telemetry')
                ->daily();
        }

        // ============================
        //    BLUEPRINT SCHEDULES
        // ============================

        // First installation must be able to create the database before scheduling Blueprint jobs.
        if (!is_file(base_path('.blueprint/extensions/blueprint/private/db/is_installed'))) {
            return;
        }

        // Blueprint telemetry
        $blueprint = app()->make(BlueprintExtensionLibrary::class);
        $telemetryEnabled = rescue(
            fn () => (bool) filter_var($blueprint->dbGet('blueprint', 'flags:telemetry_enabled', false), FILTER_VALIDATE_BOOLEAN),
            false,
            false,
        );
        if ($telemetryEnabled) {
            $registerBlueprintTelemetry = app()->make(RegisterBlueprintTelemetry::class);
            $registerBlueprintTelemetry->register($schedule);
        }

        // Blueprint-related utilities
        $minuteOfDay = hexdec(substr(hash('sha256', config('app.url')), 0, 6)) % 1440;
        $time = sprintf('%02d:%02d', intdiv($minuteOfDay, 60), $minuteOfDay % 60);
        $schedule->command('bp:version:cache')->dailyAt($time)->withoutOverlapping();
        $schedule->command('bp:meta')->dailyAt($time)->withoutOverlapping();

        // Blueprint extension schedules
        GetExtensionSchedules::schedules($schedule);
    }
}
