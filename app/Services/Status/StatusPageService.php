<?php

namespace Pterodactyl\Services\Status;

use Illuminate\Support\Facades\DB;
use GuzzleHttp\Promise\EachPromise;
use Pterodactyl\Models\StatusCheck;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\StatusIncident;
use Pterodactyl\Models\StatusComponent;
use Pterodactyl\Services\Webhooks\WebhookEmitter;
use Pterodactyl\Services\Integrations\IntegrationSettings;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;

class StatusPageService
{
    public function collect(IntegrationSettings $settings): void
    {
        StatusCheck::where('checked_at', '<', now()->subDays(30))->delete();
        if (!$settings->statusEnabled()) {
            return;
        }
        Cache::lock('status-page:collect', 300)->get(function () {
            $components = StatusComponent::with('node')->get();
            $requests = function () use ($components) {
                foreach ($components as $component) {
                    if ($component->node->maintenance_mode) {
                        $this->record($component->id, 'maintenance');
                        continue;
                    }
                    try {
                        yield $component->id => app(DaemonConfigurationRepository::class)->setNode($component->node)->getHttpClient()
                            ->getAsync('/api/system?v=2', ['timeout' => 3, 'connect_timeout' => 2, 'allow_redirects' => false]);
                    } catch (\Exception) {
                        $this->record($component->id, 'down');
                    }
                }
            };
            (new EachPromise($requests(), [
                'concurrency' => 4,
                'fulfilled' => function ($response, $id) {
                    $data = json_decode((string) $response->getBody(), true);
                    $this->record($id, $response->getStatusCode() === 200 && is_string($data['version'] ?? null) ? 'up' : 'down');
                },
                'rejected' => fn ($reason, $id) => $this->record($id, 'down'),
            ]))->promise()->wait();
            Cache::forget('status-page:snapshot');
        });
    }

    private function record(int $id, string $status): void
    {
        DB::transaction(function () use ($id, $status) {
            $component = StatusComponent::whereKey($id)->lockForUpdate()->first();
            if (!$component) {
                return;
            }
            $previous = StatusCheck::where('status_component_id', $id)->latest('id')->value('status');
            StatusCheck::create(['status_component_id' => $id, 'status' => $status, 'checked_at' => now()]);
            if ($previous && $previous !== $status) {
                app(WebhookEmitter::class)->emit('status.health.changed', ['component_id' => $id, 'name' => $component->name, 'previous' => $previous, 'status' => $status]);
            }
        });
    }

    public function snapshot(): array
    {
        return Cache::remember('status-page:snapshot', 20, function () {
            $totals = StatusCheck::where('checked_at', '>=', now()->subDays(30))
                ->selectRaw('status_component_id, status, COUNT(*) AS samples')->groupBy('status_component_id', 'status')->get()->groupBy('status_component_id');
            $components = StatusComponent::with('latestCheck')->orderBy('id')->get()->map(function ($component) use ($totals) {
                $check = $component->latestCheck;
                $counts = ($totals->get($component->id) ?? collect())->pluck('samples', 'status');
                $known = (int) $counts->get('up', 0) + (int) $counts->get('down', 0);

                return [
                    'name' => $component->name,
                    'status' => $check && $check->checked_at->gte(now()->subMinutes(3)) ? $check->status : 'unknown',
                    'checked_at' => $check?->checked_at,
                    'availability' => $known ? round(100 * (int) $counts->get('up', 0) / $known, 2) : null,
                    'samples' => $known,
                ];
            })->all();
            $active = StatusIncident::whereNull('resolved_at')->latest()->limit(50)->get(['id', 'title', 'message', 'status', 'created_at', 'updated_at']);
            $resolved = StatusIncident::whereNotNull('resolved_at')->latest('resolved_at')->limit(10)->get(['id', 'title', 'message', 'status', 'created_at', 'updated_at', 'resolved_at']);
            $states = array_column($components, 'status');
            $overall = match (true) {
                $active->isNotEmpty(), in_array('down', $states, true) => 'disruption',
                in_array('unknown', $states, true), $states === [] => 'unknown',
                in_array('maintenance', $states, true) => 'maintenance',
                default => 'up',
            };

            return compact('components', 'active', 'resolved', 'overall');
        });
    }
}
