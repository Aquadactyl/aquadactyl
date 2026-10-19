<?php

namespace Pterodactyl\Http\Controllers\Admin;

use Illuminate\View\View;
use Pterodactyl\Models\Node;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\Nodes\DaemonUsageSnapshot;

class DaemonStatsController extends Controller
{
    public function index(): View
    {
        return view('admin.daemon-stats', ['nodes' => Node::query()->with('location')->withCount('servers')->orderBy('name')->paginate(12)]);
    }

    public function status(Node $node, DaemonUsageSnapshot $snapshot): JsonResponse
    {
        $data = Cache::remember('daemon-overview:v2:' . $node->id, 15, fn () => $snapshot->get($node));

        return response()->json($data)->header('Cache-Control', 'no-store');
    }
}
