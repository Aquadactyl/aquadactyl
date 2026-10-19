<?php

namespace Pterodactyl\Services\Nodes;

use Pterodactyl\Models\Node;

class DaemonResourceUsage
{
    public function capacity(Node $node, int $threads): array
    {
        $totals = $node->servers()->toBase()->selectRaw('COALESCE(SUM(memory), 0) AS memory, COALESCE(SUM(disk), 0) AS disk, COALESCE(SUM(cpu), 0) AS cpu, COALESCE(SUM(memory = 0), 0) AS unlimited_memory, COALESCE(SUM(disk = 0), 0) AS unlimited_disk, COALESCE(SUM(cpu = 0), 0) AS unlimited_cpu')->first();
        $capacity = [];
        foreach (['memory', 'disk', 'cpu'] as $resource) {
            $scale = $resource === 'cpu' ? 0.01 : 1048576;
            $assigned = (float) $totals->{$resource} * $scale;
            $total = $resource === 'cpu' ? ($threads > 0 ? $threads : null)
                : ($node->{$resource . '_overallocate'} === -1 ? null : $node->{$resource} * 1048576 * (1 + $node->{$resource . '_overallocate'} / 100));
            $capacity[$resource] = [
                'assigned' => $assigned,
                'total' => $total,
                'available' => $total === null ? null : max(0, $total - $assigned),
                'overallocated' => $total === null ? 0 : max(0, $assigned - $total),
                'unlimited_servers' => (int) $totals->{'unlimited_' . $resource},
            ];
        }

        return $capacity;
    }

    public function servers(array $servers): ?array
    {
        $usage = ['memory_bytes' => 0, 'disk_bytes' => 0, 'cpu_threads' => 0, 'network_rx_bytes' => 0, 'network_tx_bytes' => 0, 'running_servers' => 0, 'servers' => count($servers)];
        foreach ($servers as $server) {
            $stats = $server['utilization'] ?? [];
            foreach (['memory_bytes', 'disk_bytes', 'cpu_absolute'] as $key) {
                if (!isset($stats[$key]) || !is_numeric($stats[$key]) || !is_finite((float) $stats[$key]) || $stats[$key] < 0) {
                    // Partial/malformed responses must not become a believable zero total.
                    return null;
                }
            }
            $usage['memory_bytes'] += (float) $stats['memory_bytes'];
            $usage['disk_bytes'] += (float) $stats['disk_bytes'];
            $usage['cpu_threads'] += (float) $stats['cpu_absolute'] / 100;
            $usage['running_servers'] += in_array($server['state'] ?? '', ['running', 'starting'], true) ? 1 : 0;
            foreach (['rx_bytes', 'tx_bytes'] as $key) {
                $value = $stats['network'][$key] ?? null;
                $target = 'network_' . $key;
                $usage[$target] = $usage[$target] !== null && is_numeric($value) && is_finite((float) $value) && $value >= 0 ? $usage[$target] + (float) $value : null;
            }
        }

        return $usage;
    }
}
