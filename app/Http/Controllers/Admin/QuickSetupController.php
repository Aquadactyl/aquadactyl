<?php

namespace Pterodactyl\Http\Controllers\Admin;

use Illuminate\Http\JsonResponse;
use Pterodactyl\Facades\Activity;
use Illuminate\Support\Facades\DB;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\Nodes\NodeCreationService;
use Pterodactyl\Http\Requests\Admin\LocationFormRequest;
use Pterodactyl\Http\Requests\Admin\Node\InlineNodeRequest;
use Pterodactyl\Services\Locations\LocationCreationService;

class QuickSetupController extends Controller
{
    public function location(LocationFormRequest $request, LocationCreationService $service): JsonResponse
    {
        $location = $service->handle($request->validated());
        Activity::event('admin:location.created')->subject($location)->log();

        return response()->json(['data' => $location->only(['id', 'short', 'long'])], 201);
    }

    public function node(InlineNodeRequest $request, NodeCreationService $service): JsonResponse
    {
        return DB::transaction(function () use ($request, $service) {
            $data = $request->validated();
            $node = $service->handle(collect($data)->except(['allocation_ip', 'allocation_port'])->all());
            $allocation = Allocation::create(['node_id' => $node->id, 'ip' => $data['allocation_ip'], 'port' => $data['allocation_port']]);
            Activity::event('admin:node.created')->subject($node, $allocation)->log();

            return response()->json(['data' => [
                'id' => $node->id, 'text' => $node->name, 'location_id' => $node->location_id,
                'allocations' => [['id' => $allocation->id, 'text' => $allocation->ip . ':' . $allocation->port]],
                'configuration_url' => route('admin.nodes.view.configuration', $node->id, false),
            ]], 201);
        });
    }
}
