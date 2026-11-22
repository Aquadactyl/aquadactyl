<?php

namespace Pterodactyl\Services\Servers;

use Pterodactyl\Models\User;
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
    public function handle(Collection $servers, ?User $user = null, bool $includeSubusers = false): void
    {
        if ($servers->isEmpty()) {
            return;
        }

        $servers->loadMissing(['node', 'egg.configFrom', 'allocations', 'transfer']);

        if ($includeSubusers) {
            // SubuserTransformer reads each member's user. Batch that too,
            // instead of issuing another user query for every membership.
            $servers->loadMissing('subusers.user');
        } elseif ($user === null) {
            $servers->loadMissing('subusers');
        } else {
            // Owners/admins have all permissions without loading membership.
            // Shared servers need only this user's row for authorization; the
            // explicit subusers include above still loads the complete list.
            $servers->filter(fn (Server $server) => !$user->root_admin && $server->owner_id !== $user->id)
                ->loadMissing(['subusers' => fn ($query) => $query->where('user_id', $user->id)]);

            foreach ($servers as $server) {
                if (!$server->relationLoaded('subusers')) {
                    $server->setRelation('subusers', new Collection());
                }
            }
        }

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
