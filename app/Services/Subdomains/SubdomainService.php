<?php

namespace Pterodactyl\Services\Subdomains;

use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\ServerSubdomain;

class SubdomainService
{
    public function __construct(private CloudflareDns $dns)
    {
    }

    public function sync(string $id): void
    {
        Cache::lock('subdomain:' . $id, 120)->get(function () use ($id) {
            $entry = ServerSubdomain::with(['domain', 'server.allocation'])->find($id);
            if (!$entry) {
                return;
            }
            try {
                $owner = 'Aquadactyl:' . $entry->id;
                $name = $entry->hostname();
                if ($entry->status === 'deleting' || !$entry->server) {
                    foreach ([[$name, 'A'], [$name, 'AAAA'], ['_minecraft._tcp.' . $name, 'SRV']] as [$host, $type]) {
                        $this->dns->removeOwned($entry->domain, $host, $type, $owner);
                    }
                    $entry->delete();

                    return;
                }
                $ip = $entry->domain->target_ip ?: $entry->server->allocation->ip;
                if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    throw new \RuntimeException('A public IP address is required.');
                }
                $target = $ip . ':' . $entry->server->allocation->port;
                if ($entry->status === 'active' && $entry->synced_target === $target) {
                    return;
                }
                $type = str_contains($ip, ':') ? 'AAAA' : 'A';
                $records = $entry->records ?? [];
                $records['address'] = $this->dns->ensure($entry->domain, ['type' => $type, 'name' => $name, 'content' => $ip, 'ttl' => 1, 'proxied' => false], $owner);
                $entry->update(['records' => $records]);
                if ($entry->minecraft_srv) {
                    $records['srv'] = $this->dns->ensure($entry->domain, [
                        'type' => 'SRV', 'name' => '_minecraft._tcp.' . $name, 'ttl' => 1,
                        'data' => ['priority' => 0, 'weight' => 5, 'port' => $entry->server->allocation->port, 'target' => $name],
                    ], $owner);
                }
                $this->dns->removeOwned($entry->domain, $name, $type === 'A' ? 'AAAA' : 'A', $owner);
                // Do not overwrite a deletion requested while the API call was in flight.
                ServerSubdomain::whereKey($id)->where('status', '!=', 'deleting')->update(['records' => json_encode($records), 'status' => 'active', 'synced_target' => $target]);
            } catch (\Exception) {
                ServerSubdomain::whereKey($id)->where('status', '!=', 'deleting')->update(['status' => 'error']);
            }
        });
    }
}
