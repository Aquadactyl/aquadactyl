<?php

namespace Pterodactyl\Http\Controllers\Admin;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Models\BlueprintInstallation;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Services\Blueprint\BlueprintArchive;
use Pterodactyl\Services\Accounts\ConfirmAccountPassword;
use Pterodactyl\Services\Blueprint\BlueprintExtensionRegistry;

class BlueprintInstallController extends Controller
{
    public function index(): View
    {
        return view('admin.blueprint-install', [
            'enabled' => config('aquadactyl.blueprint.web_install_enabled'),
            'workerReady' => Cache::has('blueprint-worker-heartbeat') || BlueprintInstallation::where('status', 'running')->exists(),
            'installations' => BlueprintInstallation::latest()->limit(20)->get(),
        ]);
    }

    public function store(Request $request, ConfirmAccountPassword $confirmation, BlueprintArchive $archives): RedirectResponse
    {
        abort_unless(config('aquadactyl.blueprint.web_install_enabled'), 403);
        abort_unless(Cache::has('blueprint-worker-heartbeat') || BlueprintInstallation::where('status', 'running')->exists(), 503, __('admin/operations.worker_unavailable'));
        $user = $confirmation->handle($request);
        $data = $request->validate(['package' => 'required|file|max:51200', 'trusted' => 'accepted', 'allow_update' => 'sometimes|boolean']);
        try {
            $identifier = $archives->inspect($data['package']->getRealPath());
        } catch (\Exception) {
            throw ValidationException::withMessages(['package' => __('admin/operations.invalid_package')]);
        }
        $installation = BlueprintInstallation::create([
            'user_id' => $user->id, 'identifier' => $identifier, 'sha256' => hash_file('sha256', $data['package']->getRealPath()), 'status' => 'uploading',
            'allow_update' => $request->boolean('allow_update'),
        ]);
        $directory = dirname($installation->archivePath());
        if (!is_dir($directory)) {
            mkdir($directory, 0700, true);
        }
        // Keep uploads private; the UUID path never uses a user-supplied filename.
        $data['package']->move($directory, $installation->id . '.blueprint');
        chmod($installation->archivePath(), 0600);
        $installation->update(['status' => 'queued']);

        return redirect('/admin/extensions/install');
    }

    public function status(): JsonResponse
    {
        return response()->json(['data' => BlueprintInstallation::latest()->limit(20)->get(['id', 'identifier', 'operation', 'status', 'message', 'updated_at'])])->header('Cache-Control', 'no-store');
    }

    public function confirmRemoval(string $identifier, BlueprintExtensionRegistry $registry): View
    {
        abort_unless($registry->installed($identifier), 404);

        return view('admin.blueprint-remove', [
            'identifier' => $identifier,
            'enabled' => config('aquadactyl.blueprint.web_install_enabled'),
            'workerReady' => Cache::has('blueprint-worker-heartbeat') || BlueprintInstallation::where('status', 'running')->exists(),
        ]);
    }

    public function remove(Request $request, string $identifier, ConfirmAccountPassword $confirmation, BlueprintExtensionRegistry $registry): RedirectResponse
    {
        abort_unless(config('aquadactyl.blueprint.web_install_enabled'), 403);
        abort_unless(Cache::has('blueprint-worker-heartbeat') || BlueprintInstallation::where('status', 'running')->exists(), 503, __('admin/operations.worker_unavailable'));
        abort_unless($registry->installed($identifier), 404);
        $user = $confirmation->handle($request);
        $request->validate(['confirm_removal' => 'accepted']);
        if (BlueprintInstallation::where('identifier', $identifier)->whereIn('status', ['uploading', 'queued', 'running'])->exists()) {
            throw ValidationException::withMessages(['confirm_removal' => __('admin/operations.extension_busy')]);
        }
        BlueprintInstallation::create([
            'user_id' => $user->id, 'identifier' => $identifier, 'operation' => 'remove', 'sha256' => '', 'status' => 'queued',
        ]);

        return redirect('/admin/extensions/install#installation-history');
    }
}
