<?php

namespace Pterodactyl\Services\Updates;

use Ramsey\Uuid\Uuid;
use Pterodactyl\Models\Node;
use Illuminate\Support\Facades\DB;
use GuzzleHttp\Promise\EachPromise;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\SoftwareUpdate;
use Pterodactyl\Services\Webhooks\WebhookEmitter;
use Pterodactyl\Services\Integrations\IntegrationSettings;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;

class SoftwareMonitor
{
    public function __construct(private IntegrationSettings $settings, private ReleaseCatalog $catalog, private ReleaseNotes $notes, private WebhookEmitter $emitter)
    {
    }

    public function check(bool $force = false): void
    {
        if (!$force && $this->settings->get('updates:enabled') !== '1') {
            return;
        }
        Cache::lock('software-monitor:check', 300)->get(function () {
            $this->observe('panel', 'panel', $this->notes->installedVersion(), null);
            $products = json_decode($this->settings->get('updates:daemon_products', '{}'), true) ?: [];
            $nodes = Node::query()->get();
            $requests = function () use ($nodes) {
                foreach ($nodes as $node) {
                    try {
                        yield $node->id => app(DaemonConfigurationRepository::class)->setNode($node)->getHttpClient()->getAsync('/api/system?v=2', ['connect_timeout' => 2, 'timeout' => 3, 'allow_redirects' => false]);
                    } catch (\Throwable) {
                        $this->failedNode($node->id);
                    }
                }
            };
            (new EachPromise($requests(), [
                'concurrency' => 4,
                'fulfilled' => function ($response, $id) use ($products) {
                    try {
                        $info = json_decode((string) $response->getBody(), true, 32, JSON_THROW_ON_ERROR);
                        if ($response->getStatusCode() !== 200 || !is_string($info['version'] ?? null) || $info['version'] === '' || strlen($info['version']) > 100) {
                            throw new \RuntimeException();
                        }
                        $override = $products[$id] ?? 'auto';
                        $product = in_array($override, ['wings', 'manta'], true) ? $override : ((str_contains(strtolower($info['version']), 'manta') || ($info['product'] ?? null) === 'manta') ? 'manta' : 'wings');
                        $this->observe('node:' . $id, $product, $info['version'], $id);
                    } catch (\Throwable) {
                        $this->failedNode($id);
                    }
                },
                'rejected' => fn ($reason, $id) => $this->failedNode($id),
            ]))->promise()->wait();
        });
    }

    public function observe(string $component, string $product, string $version, ?int $nodeId): void
    {
        $release = $this->catalog->latest($product);
        DB::transaction(function () use ($component, $product, $version, $nodeId, $release) {
            $state = SoftwareUpdate::where('component', $component)->lockForUpdate()->first();
            if ($state && $state->installed_version !== $version) {
                $this->emitter->emit('updates.installed', ['component' => $component, 'product' => $product, 'previous' => $state->installed_version, 'installed' => $version]);
            }
            SoftwareUpdate::updateOrCreate(['component' => $component], ['node_id' => $nodeId, 'product' => $product, 'installed_version' => $version,
                'latest_version' => $release['tag'], 'release_url' => $release['url'], 'release_notes' => $release['notes'], 'checked_at' => now(), 'last_error' => $release['error']]);
            if ($release['tag'] && self::newer($version, $release['tag'])) {
                $id = Uuid::uuid5(Uuid::NAMESPACE_URL, 'aquadactyl:update:' . $component . ':' . $product . ':' . $version . ':' . $release['tag'])->toString();
                $this->emitter->emit('updates.available', ['component' => $component, 'product' => $product, 'installed' => $version, 'available' => $release['tag'], 'release_url' => $release['url']], $id);
            }
        });
    }

    public static function newer(string $installed, string $latest): bool
    {
        return preg_match('/^v?[0-9]+\.[0-9]+\.[0-9]+$/D', $installed) === 1
            && preg_match('/^v?[0-9]+\.[0-9]+\.[0-9]+$/D', $latest) === 1
            && version_compare(ltrim($latest, 'v'), ltrim($installed, 'v'), '>');
    }

    private function failedNode(int $id): void
    {
        // Preserve the last known version and never report an outage as a version change.
        SoftwareUpdate::where('component', 'node:' . $id)->update(['last_error' => 'The daemon version could not be checked.']);
    }
}
