<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Pterodactyl\Models\Server;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\ServerSubdomain;
use Pterodactyl\Models\SubdomainDomain;
use Pterodactyl\Jobs\SyncServerSubdomain;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Http\Requests\Api\Client\Servers\Settings\SubdomainRequest;

class SubdomainController extends Controller
{
    public function index(SubdomainRequest $request, Server $server): JsonResponse
    {
        $entry = ServerSubdomain::with('domain')->where('server_id', $server->id)->first();

        return response()->json([
            'domains' => SubdomainDomain::where('enabled', true)->orderBy('domain')->get(['id', 'domain']),
            'subdomain' => $entry ? ['hostname' => $entry->hostname(), 'status' => $entry->status, 'minecraft_srv' => $entry->minecraft_srv, 'port' => $server->allocation->port] : null,
        ])->header('Cache-Control', 'no-store');
    }

    public function store(SubdomainRequest $request, Server $server): JsonResponse
    {
        $data = $request->validated();
        $domain = SubdomainDomain::where('enabled', true)->findOrFail($data['domain_id']);

        return Cache::lock('subdomain-reservations', 10)->block(5, function () use ($domain, $data, $server) {
            abort_if(ServerSubdomain::where('server_id', $server->id)->exists(), 409, __('admin/operations.remove_subdomain_first'));
            abort_if(ServerSubdomain::where('domain_id', $domain->id)->where('label', $data['label'])->exists(), 409, __('admin/operations.name_taken'));
            $entry = ServerSubdomain::create($data + ['server_id' => $server->id]);
            SyncServerSubdomain::dispatch($entry->id)->afterCommit();

            return response()->json(['status' => 'pending'], 202);
        });
    }

    public function destroy(SubdomainRequest $request, Server $server): JsonResponse
    {
        $entry = ServerSubdomain::where('server_id', $server->id)->firstOrFail();
        $entry->update(['status' => 'deleting']);
        SyncServerSubdomain::dispatch($entry->id)->afterCommit();

        return response()->json(['status' => 'deleting'], 202);
    }
}
