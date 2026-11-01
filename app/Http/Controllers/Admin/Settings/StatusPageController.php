<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Pterodactyl\Models\Node;
use Illuminate\Validation\Rule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\StatusIncident;
use Pterodactyl\Models\StatusComponent;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\Integrations\IntegrationSettings;

class StatusPageController extends Controller
{
    public function index(IntegrationSettings $settings): View
    {
        return view('admin.settings.status', [
            'enabled' => $settings->statusEnabled(), 'visibility' => $settings->get('status:visibility', 'signed_in'),
            'statusTitle' => $settings->get('status:title'), 'description' => $settings->get('status:description'),
            'components' => StatusComponent::with(['node', 'latestCheck'])->get(),
            'nodes' => Node::orderBy('name')->get(['id', 'name']),
            'incidents' => StatusIncident::latest()->paginate(10),
        ]);
    }

    public function update(Request $request, IntegrationSettings $settings): RedirectResponse
    {
        $data = $request->validate(['enabled' => 'required|boolean', 'visibility' => 'required|in:public,signed_in', 'title' => 'nullable|string|max:120', 'description' => 'nullable|string|max:1000']);
        foreach (['enabled', 'visibility', 'title', 'description'] as $key) {
            $settings->set('status:' . $key, $key === 'enabled' ? ($data[$key] ? '1' : '0') : ($data[$key] ?? ''));
        }

        return $this->saved();
    }

    public function component(Request $request): RedirectResponse
    {
        $data = $request->validate(['node_id' => ['required', 'integer', 'exists:nodes,id', Rule::unique('status_components', 'node_id')], 'name' => 'required|string|max:100']);
        StatusComponent::create($data);

        return $this->saved();
    }

    public function removeComponent(StatusComponent $component): RedirectResponse
    {
        $component->delete();

        return $this->saved();
    }

    public function incident(Request $request, ?StatusIncident $incident = null): RedirectResponse
    {
        $data = $request->validate(['title' => 'required|string|max:160', 'message' => 'required|string|max:5000', 'status' => ['required', Rule::in(StatusIncident::STATES)]]);
        $data['resolved_at'] = $data['status'] === 'resolved' ? ($incident->resolved_at ?? now()) : null;
        ($incident ?? new StatusIncident())->fill($data)->save();

        return $this->saved();
    }

    private function saved(): RedirectResponse
    {
        Cache::forget('status-page:snapshot');
        app(\Prologue\Alerts\AlertsMessageBag::class)->success(__('integrations.saved'))->flash();

        return new RedirectResponse(route('admin.settings.status', [], false));
    }
}
