<?php

namespace Pterodactyl\Http\Controllers\Admin\Settings;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\RedirectResponse;
use Pterodactyl\Models\WebhookDelivery;
use Pterodactyl\Models\WebhookEndpoint;
use Pterodactyl\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Services\Webhooks\WebhookTarget;
use Pterodactyl\Services\Webhooks\WebhookEmitter;
use Pterodactyl\Services\Accounts\ConfirmAccountPassword;

class WebhooksController extends Controller
{
    public function index(): View
    {
        return view('admin.settings.webhooks', ['endpoints' => WebhookEndpoint::orderBy('id')->get(),
            'deliveries' => WebhookDelivery::with('endpoint:id,name,format')->latest('id')->paginate(20),
            'retryable' => WebhookDelivery::where('status', 'failed')->latest('id')->limit(100)->get(['id', 'event_type']),
        ]);
    }

    public function store(Request $request, ConfirmAccountPassword $confirmation, WebhookTarget $target): RedirectResponse
    {
        $confirmation->handle($request);
        if (WebhookEndpoint::count() >= 20) {
            throw ValidationException::withMessages(['name' => __('webhooks.endpoint_limit')]);
        }
        $endpoint = new WebhookEndpoint(['revision' => 1]);
        $this->fill($request, $endpoint, $target);
        $endpoint->save();
        WebhookEmitter::clearSubscriptions();

        return $this->saved();
    }

    public function action(Request $request, WebhookEndpoint $endpoint, ConfirmAccountPassword $confirmation, WebhookTarget $target, WebhookEmitter $emitter): RedirectResponse
    {
        $confirmation->handle($request);
        $operation = $request->validate(['operation' => 'required|in:save,test,delete'])['operation'];
        if ($operation === 'delete') {
            $endpoint->delete();
        } elseif ($operation === 'test') {
            if (!$endpoint->enabled) {
                throw ValidationException::withMessages(['operation' => __('webhooks.enable_first')]);
            }
            $emitter->test($endpoint);
        } else {
            $this->fill($request, $endpoint, $target);
            if ($endpoint->isDirty(['format', 'enabled', 'events', 'url', 'signing_secret'])) {
                ++$endpoint->revision;
            }
            $endpoint->save();
        }
        WebhookEmitter::clearSubscriptions();

        return $this->saved();
    }

    public function retry(Request $request, ConfirmAccountPassword $confirmation, WebhookEmitter $emitter): RedirectResponse
    {
        $confirmation->handle($request);
        $id = $request->validate(['delivery_id' => 'required|integer|exists:webhook_deliveries,id'])['delivery_id'];
        DB::transaction(function () use ($id, $emitter) {
            $delivery = WebhookDelivery::with('endpoint')->lockForUpdate()->findOrFail($id);
            if ($delivery->status !== 'failed' || !$delivery->endpoint?->enabled || $delivery->endpoint_revision !== $delivery->endpoint->revision) {
                throw ValidationException::withMessages(['delivery_id' => __('webhooks.retry_unavailable')]);
            }
            // Keep the original event and delivery IDs so receivers can deduplicate manual retries too.
            $delivery->update(['status' => 'pending', 'attempts' => 0, 'last_error' => null, 'last_status' => null, 'next_attempt_at' => now(), 'created_at' => now()]);
            $emitter->queue($delivery->id);
        });

        return $this->saved();
    }

    private function fill(Request $request, WebhookEndpoint $endpoint, WebhookTarget $target): void
    {
        $data = $request->validate(['name' => 'required|string|max:100', 'format' => 'required|in:json,discord', 'enabled' => 'required|boolean',
            'events' => 'required|array|min:1|max:5', 'events.*' => ['required', 'string', 'distinct', Rule::in(WebhookEndpoint::GROUPS)],
            'webhook_url' => 'nullable|string|max:2048', 'webhook_secret' => 'nullable|string|min:32|max:255',
        ]);
        try {
            $url = $target->validate($data['webhook_url'] ?? $endpoint->url ?? '', $data['format'])['url'];
        } catch (\Throwable) {
            throw ValidationException::withMessages(['webhook_url' => __('webhooks.url_invalid')]);
        }
        if ($data['format'] === 'json' && empty($data['webhook_secret']) && !$endpoint->signing_secret) {
            throw ValidationException::withMessages(['webhook_secret' => __('webhooks.secret_required')]);
        }
        $endpoint->fill(array_intersect_key($data, array_flip(['name', 'format', 'enabled', 'events'])));
        if (!empty($data['webhook_url'])) {
            $endpoint->url = $url;
        }
        if ($data['format'] === 'discord') {
            $endpoint->signing_secret = null;
        } elseif (!empty($data['webhook_secret'])) {
            $endpoint->signing_secret = $data['webhook_secret'];
        }
    }

    private function saved(): RedirectResponse
    {
        app(\Prologue\Alerts\AlertsMessageBag::class)->success(__('webhooks.saved'))->flash();

        return new RedirectResponse(route('admin.settings.webhooks', [], false));
    }
}
