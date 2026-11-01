<?php

namespace Pterodactyl\Console\Commands\Updates;

use Illuminate\Console\Command;
use Pterodactyl\Services\Updates\SoftwareMonitor;

class CheckSoftwareUpdatesCommand extends Command
{
    protected $signature = 'p:updates:check {--force : Check once even when automatic checks are disabled}';
    protected $description = 'Check official panel and daemon releases and report observed installed version changes.';

    public function handle(SoftwareMonitor $monitor): int
    {
        $monitor->check((bool) $this->option('force'));

        return self::SUCCESS;
    }
}
