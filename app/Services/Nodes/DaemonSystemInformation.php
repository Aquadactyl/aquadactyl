<?php

namespace Pterodactyl\Services\Nodes;

use Illuminate\Support\Str;

class DaemonSystemInformation
{
    public function normalize(array $data): array
    {
        $system = is_array($data['system'] ?? null) ? $data['system'] : $data;
        $docker = is_array($data['docker'] ?? null) ? $data['docker'] : [];

        return [
            'version' => (string) ($data['version'] ?? ''),
            'system' => [
                'type' => Str::title((string) ($system['os'] ?? 'Unknown')),
                'arch' => (string) ($system['architecture'] ?? '--'),
                'release' => (string) ($system['kernel_version'] ?? '--'),
                'cpus' => max(0, (int) ($system['cpu_threads'] ?? $system['cpu_count'] ?? 0)),
                'memory_bytes' => max(0, (int) ($system['memory_bytes'] ?? 0)),
            ],
            'docker' => ['version' => (string) ($docker['version'] ?? '--')],
        ];
    }
}
