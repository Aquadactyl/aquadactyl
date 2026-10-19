<?php

namespace Pterodactyl\Console\Commands\Blueprint;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\BlueprintInstallation;
use Pterodactyl\Services\Blueprint\BlueprintInstaller;

class BlueprintInstallWorker extends Command
{
    protected $signature = 'p:blueprint:work {--once : Process at most one queued operation}';

    protected $description = 'Run the dedicated privileged Blueprint installation and removal worker.';

    public function handle(BlueprintInstaller $installer): int
    {
        if (!config('aquadactyl.blueprint.web_install_enabled') || !function_exists('posix_geteuid') || posix_geteuid() !== 0) {
            $this->error('Enable AQUADACTYL_BLUEPRINT_WEB_INSTALL_ENABLED and run this dedicated worker as root.');

            return self::FAILURE;
        }
        do {
            Cache::put('blueprint-worker-heartbeat', time(), 45);
            BlueprintInstallation::where('status', 'running')->where('updated_at', '<', now()->subMinutes(35))
                ->update(['status' => 'failed', 'message' => 'The Blueprint operation was interrupted. Review the extension before retrying.']);
            $worked = $installer->runNext();
            if (!$this->option('once') && !$worked) {
                sleep(5);
            }
        } while (!$this->option('once'));

        return self::SUCCESS;
    }
}
