<?php

namespace Pterodactyl\Services\Servers;

use Pterodactyl\Models\Server;
use Pterodactyl\Models\SoftwareUpdate;
use Illuminate\Database\Eloquent\Collection;

class ServerListRelationsService
{
    /**
     * Load the relationships used by the client server list in batches.
     *
     * @param Collection<int, Server> $servers
     */
    public function handle(Collection $servers): void
    {
        if ($servers->isEmpty()) {
            return;
        }

        $servers->loadMissing(['node', 'egg.configFrom', 'allocations', 'transfer', 'subusers']);

        app(ServerVariableLoader::class)->load($servers);
        $products = SoftwareUpdate::query()->whereIn('component', $servers->pluck('node_id')->unique()->map(fn ($id) => 'node:' . $id))->pluck('product', 'component');

        foreach ($servers as $server) {
            $server->setAttribute('daemon_product', $products->get('node:' . $server->node_id) ?? 'wings');
            // AllocationTransformer needs the parent only to identify the
            // primary allocation; reuse the already hydrated server instance.
            foreach ($server->allocations as $allocation) {
                $allocation->setRelation('server', $server);
            }
            $server->allocation?->setRelation('server', $server);
        }
    }
}
