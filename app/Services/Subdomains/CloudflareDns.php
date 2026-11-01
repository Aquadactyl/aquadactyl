<?php

namespace Pterodactyl\Services\Subdomains;

use Illuminate\Support\Facades\Http;
use Pterodactyl\Models\SubdomainDomain;

class CloudflareDns
{
    public function request(SubdomainDomain $domain, string $method, string $path, array $data = []): array
    {
        $response = Http::baseUrl('https://api.cloudflare.com/client/v4/zones/' . $domain->zone_id)
            ->withToken($domain->api_token)->acceptJson()->connectTimeout(3)->timeout(10)->withoutRedirecting()
            ->send($method, $path, [$method === 'GET' ? 'query' : 'json' => $data]);
        // A deletion retried after a lost response is already complete.
        if ($method === 'DELETE' && $response->status() === 404) {
            return [];
        }
        if (!$response->successful() || $response->json('success') !== true) {
            throw new \RuntimeException('Cloudflare DNS request failed. Check the zone and token permissions.');
        }

        return $response->json('result') ?? [];
    }

    public function ensure(SubdomainDomain $domain, array $record, string $owner): string
    {
        $matches = $this->request($domain, 'GET', '/dns_records', ['name' => $record['name'], 'type' => $record['type'], 'per_page' => 100]);
        if ($matches !== []) {
            // Never overwrite records owned by another panel or created outside the panel.
            if (count($matches) !== 1 || ($matches[0]['comment'] ?? '') !== $owner) {
                throw new \RuntimeException('This DNS name is already in use.');
            }
            $id = $matches[0]['id'];
            $this->request($domain, 'PUT', '/dns_records/' . $id, $record + ['comment' => $owner]);

            return $id;
        }
        $created = $this->request($domain, 'POST', '/dns_records', $record + ['comment' => $owner]);

        return $created['id'];
    }

    public function removeOwned(SubdomainDomain $domain, string $name, string $type, string $owner): void
    {
        // Discover by ownership too: a successful creation may have lost its HTTP response.
        $records = $this->request($domain, 'GET', '/dns_records', ['name' => $name, 'type' => $type, 'per_page' => 100]);
        foreach ($records as $record) {
            if (($record['comment'] ?? '') === $owner) {
                $this->request($domain, 'DELETE', '/dns_records/' . $record['id']);
            }
        }
    }
}
