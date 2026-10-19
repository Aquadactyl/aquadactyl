<?php

namespace Pterodactyl\Jobs;

use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Pterodactyl\Services\Updates\SoftwareMonitor;

class CheckSoftwareUpdates implements ShouldQueue, ShouldBeUnique
{
    use Queueable;

    public int $uniqueFor = 600;
    public int $timeout = 300;

    public function __construct()
    {
        $this->onQueue('low');
    }

    public function handle(SoftwareMonitor $monitor): void
    {
        $monitor->check(true);
    }
}
