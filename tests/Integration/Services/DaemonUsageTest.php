<?php

use GuzzleHttp\Client;
use GuzzleHttp\HandlerStack;
use Pterodactyl\Models\Node;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Location;
use GuzzleHttp\Handler\MockHandler;
use Pterodactyl\Services\Nodes\DaemonResourceUsage;
use Pterodactyl\Services\Nodes\DaemonUsageSnapshot;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;

uses(DatabaseTransactions::class);

beforeEach(function () {
    $this->node = Node::factory()->for(Location::factory())->create(['memory' => 1024, 'disk' => 4096, 'memory_overallocate' => 0, 'disk_overallocate' => 0]);
    $this->systemInfo = ['version' => 'manta', 'system' => ['cpu_threads' => 4, 'memory_bytes' => 8589934592]];
    $this->stats = ['state' => 'running', 'utilization' => ['memory_bytes' => 536870912, 'disk_bytes' => 1073741824, 'cpu_absolute' => 150, 'network' => ['rx_bytes' => 100, 'tx_bytes' => 200]], 'configuration' => ['environment' => ['PASSWORD' => 'private-test-secret']]];
    $this->probe = function (array $responses): array {
        $client = new Client(['handler' => HandlerStack::create(new MockHandler($responses))]);
        $this->mock(DaemonConfigurationRepository::class)->shouldReceive('setNode')->once()->andReturnSelf()->shouldReceive('getHttpClient')->once()->andReturn($client);

        return app(DaemonUsageSnapshot::class)->get($this->node);
    };
});

test('assigned limits report remaining capacity without counting unlimited limits as fixed reservations', function () {
    $this->createServerModel(['node_id' => $this->node->id, 'memory' => 512, 'disk' => 2048, 'cpu' => 150]);
    $this->createServerModel(['node_id' => $this->node->id, 'memory' => 0, 'disk' => 0, 'cpu' => 0]);
    $data = app(DaemonResourceUsage::class)->capacity($this->node, 4);
    expect($data['memory'])->toMatchArray(['assigned' => 536870912.0, 'total' => 1073741824, 'available' => 536870912.0, 'overallocated' => 0, 'unlimited_servers' => 1])
        ->and($data['cpu'])->toMatchArray(['assigned' => 1.5, 'total' => 4, 'available' => 2.5, 'unlimited_servers' => 1])
        ->and($data['disk']['assigned'])->toBe(2147483648.0);
});

test('overassignment overallocation allowances and unknown CPU totals remain explicit', function () {
    $this->node->update(['memory_overallocate' => 50, 'disk_overallocate' => -1]);
    $this->createServerModel(['node_id' => $this->node->id, 'memory' => 2048, 'disk' => 2048, 'cpu' => 150]);
    $data = app(DaemonResourceUsage::class)->capacity($this->node, 0);
    expect($data['memory']['total'])->toEqual(1610612736)->and($data['memory']['available'])->toBe(0)->and($data['memory']['overallocated'])->toEqual(536870912)
        ->and($data['disk']['total'])->toBeNull()->and($data['disk']['available'])->toBeNull()->and($data['cpu']['total'])->toBeNull()->and($data['cpu']['available'])->toBeNull();
});

test('empty nodes have genuine zero server usage and assignments', function () {
    expect(app(DaemonResourceUsage::class)->servers([])['memory_bytes'])->toBe(0)
        ->and(app(DaemonResourceUsage::class)->capacity($this->node, 4)['memory']['assigned'])->toBe(0.0);
});

test('server usage aggregates counters and CPU threads without returning configuration secrets', function () {
    $idle = $this->stats;
    $idle['state'] = 'offline';
    $idle['utilization']['memory_bytes'] = 0;
    $idle['utilization']['cpu_absolute'] = 0;
    $data = app(DaemonResourceUsage::class)->servers([$this->stats, $idle]);
    expect($data)->toMatchArray(['memory_bytes' => 536870912.0, 'disk_bytes' => 2147483648.0, 'cpu_threads' => 1.5, 'running_servers' => 1, 'servers' => 2, 'network_rx_bytes' => 200.0, 'network_tx_bytes' => 400.0]);
    expect(json_encode($data))->not->toContain('private-test-secret');
});

test('missing network samples remain unknown while valid RAM and CPU are retained', function () {
    $missing = $this->stats;
    unset($missing['utilization']['network']);
    $data = app(DaemonResourceUsage::class)->servers([$missing, $this->stats]);
    expect($data['network_rx_bytes'])->toBeNull()->and($data['network_tx_bytes'])->toBeNull()->and($data['cpu_threads'])->toBe(3.0);
});

test('partial or malformed utilization does not become a false zero', function (mixed $value) {
    $this->stats['utilization']['memory_bytes'] = $value;
    expect(app(DaemonResourceUsage::class)->servers([$this->stats]))->toBeNull();
})->with([null, 'invalid', -1, INF]);

test('Manta host metrics preserve idle zero samples and expose only allowed numeric fields', function () {
    $this->systemInfo['capabilities'] = ['system_usage' => true];
    $host = ['cpu_percent' => 0, 'memory_total_bytes' => 8589934592, 'memory_used_bytes' => 0, 'disk_total_bytes' => 17179869184, 'disk_used_bytes' => 1073741824, 'config' => 'private-test-secret'];
    $data = ($this->probe)([new Response(200, [], json_encode($this->systemInfo)), new Response(200, [], json_encode([$this->stats])), new Response(200, [], json_encode($host))]);
    expect($data['online'])->toBeTrue()->and($data['usage']['cpu_threads'])->toBe(1.5)->and($data['host_usage']['cpu_percent'])->toBe(0.0)->and($data['host_usage']['memory_used_bytes'])->toBe(0.0);
    expect(json_encode($data))->not->toContain('private-test-secret');
});

test('stock Wings works without advertising host utilization', function () {
    $data = ($this->probe)([new Response(200, [], '{"version":"wings","cpu_count":8}'), new Response(200, [], json_encode([$this->stats]))]);
    expect($data['online'])->toBeTrue()->and($data['system']['cpus'])->toBe(8)->and($data['usage']['memory_bytes'])->toBe(536870912.0)->and($data['host_usage'])->toBeNull();
});

test('host sampling failures keep independent server usage and system health', function (string $body, int $status) {
    $this->systemInfo['capabilities'] = ['system_usage' => true];
    $data = ($this->probe)([new Response(200, [], json_encode($this->systemInfo)), new Response(200, [], json_encode([$this->stats])), new Response($status, [], $body)]);
    expect($data['online'])->toBeTrue()->and($data['usage']['cpu_threads'])->toBe(1.5)->and($data['host_usage'])->toBeNull();
})->with([['invalid json', 200], ['unavailable', 503]]);

test('invalid host counters are not converted to zeros', function () {
    $this->systemInfo['capabilities'] = ['system_usage' => true];
    $data = ($this->probe)([new Response(200, [], json_encode($this->systemInfo)), new Response(200, [], '[]'), new Response(200, [], '{"cpu_percent":"invalid","memory_used_bytes":-1}')]);
    expect($data['host_usage']['cpu_percent'])->toBeNull()->and($data['host_usage']['memory_used_bytes'])->toBeNull();
});

test('server list failures never appear as an idle empty node', function (string $body, int $status) {
    $data = ($this->probe)([new Response(200, [], json_encode($this->systemInfo)), new Response($status, [], $body)]);
    expect($data['online'])->toBeTrue()->and($data['usage'])->toBeNull()->and($data['capacity']['memory']['total'])->toEqual(1073741824);
})->with([['null', 200], ['{}', 200], ['{"items":[]}', 200], ['invalid', 200], ['unavailable', 503]]);

test('system failures retain independently available server samples', function () {
    $data = ($this->probe)([new Response(503, [], 'unavailable'), new Response(200, [], json_encode([$this->stats]))]);
    expect($data['online'])->toBeFalse()->and($data['usage']['cpu_threads'])->toBe(1.5)->and($data['capacity']['cpu']['total'])->toBeNull();
});

test('malformed connections fail safely while retaining configured assignment capacity', function () {
    $this->mock(DaemonConfigurationRepository::class)->shouldReceive('setNode')->once()->andReturnSelf()->shouldReceive('getHttpClient')->once()->andThrow(new RuntimeException('Bearer private-test-secret'));
    $data = app(DaemonUsageSnapshot::class)->get($this->node);
    expect($data['online'])->toBeFalse()->and($data['usage'])->toBeNull()->and($data['capacity']['memory']['total'])->toEqual(1073741824);
    expect(json_encode($data))->not->toContain('private-test-secret');
});
