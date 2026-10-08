<?php

namespace Pterodactyl\Services\Servers\GameQuery;

use Pterodactyl\Models\Server;

class GameQuerySettingsService
{
    public function game(Server $server): ?string
    {
        if (!config('game-query.enabled') || $server->game_query_type === 'none') {
            return null;
        }
        if ($server->game_query_type !== 'auto') {
            return array_key_exists($server->game_query_type, config('game-query.games')) ? $server->game_query_type : null;
        }
        $name = strtolower($server->egg->name);
        $patterns = [
            'bedrock|pocketmine|nukkit' => 'protocol-minecraftbedrock',
            'minecraft|paper|purpur|spigot|bungeecord|waterfall|velocity|forge|fabric|sponge|folia' => 'protocol-minecraftvanilla',
            'counter.?strike.?2|cs.?2' => 'counterstrike2',
            'counter.?strike.*global|cs.?go' => 'csgo',
            'counter.?strike.*source' => 'css',
            'garry|gmod' => 'garrysmod',
            'team.?fortress.?2|tf2' => 'teamfortress2',
            'left.?4.?dead.?2|l4d2' => 'l4d2',
            '\brust\b' => 'rust',
            'valheim' => 'valheim',
            '\bark\b' => 'ase',
            'dayz' => 'dayz',
            'unturned' => 'unturned',
            'insurgency.*sandstorm' => 'insurgencysandstorm',
            'insurgency' => 'insurgency',
            '\bsource\b|\bsteam\b|7.?days.?to.?die|conan.?exiles' => 'protocol-valve',
        ];
        foreach ($patterns as $pattern => $game) {
            if (preg_match('/' . $pattern . '/i', $name)) {
                return $game;
            }
        }

        return null;
    }

    public function target(Server $server): ?array
    {
        $game = $this->game($server);
        $allocation = $server->gameQueryAllocation ?? $server->allocation;
        if (!$game || !$allocation || $allocation->server_id !== $server->id || $allocation->node_id !== $server->node_id) {
            return null;
        }
        $host = $server->node->query_address ?: $allocation->ip;
        if (!$server->node->query_address && in_array($host, ['127.0.0.1', '::1', '0.0.0.0', '::'], true)) {
            // The local panel shares the game container network; UUIDs are Docker DNS names.
            $host = config('game-query.local_container_queries') && $server->node->fqdn === 'wings.localhost'
                ? $server->uuid : $server->node->fqdn;
        }

        return [
            'type' => $game,
            'host' => $host,
            'port' => $allocation->port,
            'givenPortOnly' => (bool) $server->game_query_allocation_id || str_starts_with($game, 'protocol-minecraft'),
        ];
    }

    public function key(Server $server, array $target): string
    {
        return 'game-query:' . $server->uuid . ':' . sha1(json_encode($target, JSON_THROW_ON_ERROR));
    }
}
