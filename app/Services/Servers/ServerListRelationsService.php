<?php

namespace Pterodactyl\Services\Servers;

use Pterodactyl\Models\Server;
use Pterodactyl\Models\EggVariable;
use Pterodactyl\Models\ServerVariable;
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

        // Server::variables() joins on the individual server ID, so ordinary
        // eager loading would mix overrides between servers sharing an egg.
        $definitions = EggVariable::query()->whereIn('egg_id', $servers->pluck('egg_id')->unique())->get()->groupBy('egg_id');
        $overrides = ServerVariable::query()->whereIn('server_id', $servers->modelKeys())->get()->groupBy('server_id');

        foreach ($servers as $server) {
            $values = ($overrides->get($server->id) ?? new Collection())->keyBy('variable_id');
            $variables = ($definitions->get($server->egg_id) ?? new Collection())->map(function (EggVariable $definition) use ($values) {
                $variable = clone $definition;
                $variable->setAttribute('server_value', $values->get($definition->id)?->variable_value);

                return $variable;
            });
            $server->setRelation('variables', $variables);

            // AllocationTransformer needs the parent only to identify the
            // primary allocation; reuse the already hydrated server instance.
            foreach ($server->allocations as $allocation) {
                $allocation->setRelation('server', $server);
            }
            $server->allocation?->setRelation('server', $server);
        }
    }
}
