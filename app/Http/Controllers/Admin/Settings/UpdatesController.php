<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Pterodactyl\Models\Node;
use Illuminate\Http\RedirectResponse;
use Pterodactyl\Models\SoftwareUpdate;
use Pterodactyl\Jobs\CheckSoftwareUpdates;
use Pterodactyl\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Services\Accounts\ConfirmAccountPassword;
use Pterodactyl\Services\Integrations\IntegrationSettings;

class UpdatesController extends Controller
{
    public function index(IntegrationSettings $settings): View
    {
        return view('admin.settings.updates', ['enabled' => $settings->get('updates:enabled') === '1',
            'products' => json_decode($settings->get('updates:daemon_products', '{}'), true) ?: [],
            'nodes' => Node::orderBy('name')->get(['id', 'name']), 'states' => SoftwareUpdate::with('node')->get()->keyBy('component'),
        ]);
    }

    public function update(Request $request, IntegrationSettings $settings, ConfirmAccountPassword $confirmation): RedirectResponse
    {
        $confirmation->handle($request);
        $data = $request->validate(['enabled' => 'required|boolean', 'products' => 'sometimes|array', 'products.*' => 'required|in:auto,wings,manta']);
        $ids = Node::pluck('id')->all();
        if (array_diff(array_keys($data['products'] ?? []), $ids)) {
            throw ValidationException::withMessages(['products' => __('webhooks.invalid_nodes')]);
        }
        $settings->set('updates:enabled', $data['enabled'] ? '1' : '0');
        $settings->set('updates:daemon_products', json_encode($data['products'] ?? [], JSON_THROW_ON_ERROR));

        return $this->saved();
    }

    public function check(): RedirectResponse
    {
        CheckSoftwareUpdates::dispatch();

        return $this->saved();
    }

    private function saved(): RedirectResponse
    {
        app(\Prologue\Alerts\AlertsMessageBag::class)->success(__('webhooks.updates_saved'))->flash();

        return new RedirectResponse(route('admin.settings.updates', [], false));
    }
}
