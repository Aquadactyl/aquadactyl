<?php

namespace Pterodactyl\Services\Servers;

use Pterodactyl\Models\Server;
use Pterodactyl\Models\EggVariable;
use Pterodactyl\Models\ServerVariable;
use Illuminate\Database\Eloquent\Collection;

class ServerVariableLoader
{
    /** @param Collection<int, Server> $servers */
    public function load(Collection $servers): void
    {
        if ($servers->isEmpty()) {
            return;
        }

        // The variables relationship joins on one model's ID and cannot be eager
        // loaded correctly for a collection. Fetch definitions and overrides once.
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
        }
    }
}
