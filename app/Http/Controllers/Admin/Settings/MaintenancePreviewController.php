<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Pterodactyl\Http\Controllers\Controller;

class MaintenancePreviewController extends Controller
{
    public function index(Request $request): Response
    {
        $data = $request->validate(['message' => 'sometimes|nullable|string|max:1000']);

        return response()->view('errors.panel-maintenance', [
            'message' => (array_key_exists('message', $data) ? $data['message'] : config('aquadactyl.maintenance.message')) ?: __('admin/operations.maintenance_default'),
            'preview' => true,
        ])->header('Cache-Control', 'no-store')->header('X-Robots-Tag', 'noindex, nofollow');
    }
}
