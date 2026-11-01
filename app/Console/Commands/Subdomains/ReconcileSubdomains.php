<?php

namespace Pterodactyl\Console\Commands\Subdomains;

use Illuminate\Console\Command;
use Pterodactyl\Models\ServerSubdomain;
use Pterodactyl\Services\Subdomains\SubdomainService;

class ReconcileSubdomains extends Command
{
    protected $signature = 'p:subdomains:sync';

    protected $description = 'Reconcile managed DNS records and clean up deleted servers.';

    public function handle(SubdomainService $service): int
    {
        ServerSubdomain::query()->orderBy('id')->chunkById(100, function ($entries) use ($service) {
            foreach ($entries as $entry) {
                $service->sync($entry->id);
            }
        });

        return self::SUCCESS;
    }
}
