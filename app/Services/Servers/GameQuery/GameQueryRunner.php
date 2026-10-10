<?php

namespace Pterodactyl\Services\Servers\GameQuery;

use Symfony\Component\Process\Process;

class GameQueryRunner
{
    public function query(array $target): array
    {
        try {
            $process = new Process([
                config('game-query.node_binary'),
                '--max-old-space-size=96',
                base_path('node_modules/tsx/dist/cli.mjs'),
                base_path('scripts/game-query.ts'),
            ]);
            $process->setInput(json_encode($target, JSON_THROW_ON_ERROR))->setTimeout(7)->run();
            $result = json_decode($process->getOutput(), true, 8, JSON_THROW_ON_ERROR);
            if ($process->isSuccessful() && ($result['status'] ?? null) === 'available'
                && is_int($result['players'] ?? null) && $result['players'] >= 0 && $result['players'] <= 1000000
                && is_int($result['max_players'] ?? null) && $result['max_players'] >= 0 && $result['max_players'] <= 1000000) {
                return ['status' => 'available', 'players' => $result['players'], 'max_players' => $result['max_players']];
            }
        } catch (\Throwable) {
            // Offline games, invalid replies, and missing query runtimes must not break the panel.
        }

        return ['status' => 'unavailable', 'players' => null, 'max_players' => null];
    }
}
