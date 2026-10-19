<?php

namespace Pterodactyl\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Pterodactyl\Services\Subdomains\SubdomainService;

class SyncServerSubdomain implements ShouldQueue
{
    use Dispatchable;
    use Queueable;

    public function __construct(public string $id)
    {
        $this->onQueue('standard');
    }

    public function handle(SubdomainService $service): void
    {
        $service->sync($this->id);
    }
}
