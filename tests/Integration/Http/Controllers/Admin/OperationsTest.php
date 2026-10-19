<?php

use GuzzleHttp\Client;
use GuzzleHttp\HandlerStack;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Location;
use GuzzleHttp\Handler\MockHandler;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Cache;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Helpers\SoftwareVersionService;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set('pterodactyl.auth.2fa_required', 0);
    Cache::forever(SoftwareVersionService::VERSION_CACHE_KEY, ['panel' => '1.0.0', 'wings' => '1.0.0']);
    $this->admin = User::factory()->create(['root_admin' => true]);
});

test('operation pages reject non administrators', function (string $path) {
    $this->actingAs(User::factory()->create(['root_admin' => false]))->getJson($path)->assertForbidden();
})->with(['/admin/daemon-stats', '/admin/extensions/install', '/admin/extensions/install/status', '/admin/subdomains']);

test('daemon overview renders without blocking on daemon requests', function () {
    $node = Node::factory()->for(Location::factory())->create(['name' => '000 Test daemon']);
    $this->actingAs($this->admin)->get('/admin/daemon-stats?page=1')->assertOk()->assertSee('Test daemon')->assertSee('Assigned limits / total');
});

test('daemon probes normalize modern responses and cache successful and failed results', function (string $body, int $status, bool $online) {
    $node = Node::factory()->for(Location::factory())->create();
    Cache::forget('daemon-overview:v2:' . $node->id);
    $client = new Client(['handler' => HandlerStack::create(new MockHandler([new Response($status, [], $body), new Response(200, [], '[]')]))]);
    $this->mock(DaemonConfigurationRepository::class)->shouldReceive('setNode')->once()->andReturnSelf()->shouldReceive('getHttpClient')->once()->andReturn($client);
    $response = $this->actingAs($this->admin)->getJson('/admin/daemon-stats/' . $node->id)->assertOk()->assertJsonPath('online', $online);
    expect($response->getContent())->not->toContain($node->daemon_token);
    if ($online) {
        $response->assertJsonPath('system.cpus', 8)->assertJsonPath('system.memory_bytes', 17179869184)->assertJsonPath('docker.version', '29.0');
    }
    $this->getJson('/admin/daemon-stats/' . $node->id)->assertExactJson($response->json());
})->with([
    ['{"version":"manta-test","system":{"os":"linux","architecture":"amd64","kernel_version":"6.1","cpu_threads":8,"memory_bytes":17179869184},"docker":{"version":"29.0"}}', 200, true],
    ['{}', 200, false], ['invalid json', 200, false], ['unavailable', 503, false],
]);

test('log viewer preserves whitespace and escapes executable markup without editor assets', function () {
    $name = 'operations-test.log';
    File::put(storage_path('logs/' . $name), "line one\n    indented\n<script>alert(1)</script>");
    try {
        $this->actingAs($this->admin)->get('/admin/settings/logs?file=' . $name)->assertOk()
            ->assertSee('<pre id="log_editor"', false)->assertSee("line one\n    indented", false)
            ->assertSee('&lt;script&gt;alert(1)&lt;/script&gt;', false)->assertDontSee('ace.edit', false);
        $this->getJson('/admin/settings/logs?file[]=invalid')->assertUnprocessable();
    } finally {
        File::delete(storage_path('logs/' . $name));
    }
});

test('log files linked outside the log directory cannot be read downloaded or deleted', function () {
    $outside = storage_path('operations-secret.txt');
    $link = storage_path('logs/operations-link.log');
    File::put($outside, 'private');
    symlink($outside, $link);
    try {
        $service = app(Pterodactyl\Services\Helpers\LogViewerService::class);
        expect($service->getLogContent('operations-link.log'))->toBe('')->and($service->getLogEntries('operations-link.log')['entries'])->toBe([])
            ->and($service->getLogPath('operations-link.log'))->toBeNull()->and($service->deleteLog('operations-link.log'))->toBeFalse()
            ->and(collect($service->getLogFiles())->pluck('name'))->not->toContain('operations-link.log');
    } finally {
        unlink($link);
        unlink($outside);
    }
});

test('administrators can persist a maintenance toggle and message', function () {
    $this->actingAs($this->admin)->patch('/admin/settings', ['app:locale' => 'en', 'pterodactyl:auth:2fa_required' => 0, 'aquadactyl:maintenance:enabled' => 'true', 'aquadactyl:maintenance:message' => 'Back at 18:00'])->assertRedirect('/admin/settings');
    $this->assertDatabaseHas('settings', ['key' => 'settings::aquadactyl:maintenance:enabled', 'value' => 'true']);
    $this->assertDatabaseHas('settings', ['key' => 'settings::aquadactyl:maintenance:message', 'value' => 'Back at 18:00']);
});
