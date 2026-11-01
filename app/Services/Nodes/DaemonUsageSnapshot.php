<?php

namespace Pterodactyl\Services\Nodes;

use Pterodactyl\Models\Node;
use GuzzleHttp\Promise\Utils;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;

class DaemonUsageSnapshot
{
    public function __construct(private DaemonConfigurationRepository $repository, private DaemonSystemInformation $system, private DaemonResourceUsage $usage)
    {
    }

    public function get(Node $node): array
    {
        $data = ['online' => false, 'usage' => null, 'host_usage' => null, 'checked_at' => now()->toIso8601String()];
        $options = ['timeout' => 3, 'connect_timeout' => 2];
        try {
            $client = $this->repository->setNode($node)->getHttpClient();
            $responses = Utils::settle([
                'system' => $client->getAsync('/api/system?v=2', $options),
                'servers' => $client->getAsync('/api/servers', $options),
            ])->wait();
        } catch (\Exception) {
            return $data + ['capacity' => $this->usage->capacity($node, 0)];
        }
        try {
            $info = $this->decode($responses['system']);
            if (!isset($info['version'])) {
                throw new \UnexpectedValueException('Missing system information.');
            }
            $data = $this->system->normalize($info) + $data;
            $data['online'] = true;
            if (($info['capabilities']['system_usage'] ?? false) === true) {
                try {
                    $host = json_decode((string) $client->get('/api/system/usage', $options)->getBody(), true, 32, JSON_THROW_ON_ERROR);
                    // Copy only numeric metrics. Never forward daemon configuration or paths.
                    foreach (['cpu_percent', 'memory_total_bytes', 'memory_used_bytes', 'disk_total_bytes', 'disk_used_bytes'] as $key) {
                        $value = $host[$key] ?? null;
                        $data['host_usage'][$key] = is_numeric($value) && is_finite((float) $value) && $value >= 0 ? (float) $value : null;
                    }
                } catch (\Exception) {
                    $data['host_usage'] = null;
                }
            }
        } catch (\Exception) {
            // Keep assignment data and independently available server metrics during failures.
        }
        try {
            $servers = $this->decode($responses['servers'], true);
            $data['usage'] = $this->usage->servers($servers);
        } catch (\Exception) {
            $data['usage'] = null;
        }
        $data['capacity'] = $this->usage->capacity($node, $data['system']['cpus'] ?? 0);

        return $data;
    }

    private function decode(array $response, bool $list = false): array
    {
        if ($response['state'] !== 'fulfilled') {
            throw new \RuntimeException('Daemon request unavailable.');
        }
        $raw = (string) $response['value']->getBody();
        $data = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
        if (!is_array($data) || ($list && (!array_is_list($data) || !str_starts_with(ltrim($raw), '[')))) {
            throw new \UnexpectedValueException('Invalid daemon response.');
        }

        return $data;
    }
}
