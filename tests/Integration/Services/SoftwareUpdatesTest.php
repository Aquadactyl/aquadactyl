<?php

use GuzzleHttp\Client;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use GuzzleHttp\Psr7\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Pterodactyl\Models\SoftwareUpdate;
use Pterodactyl\Models\WebhookDelivery;
use Pterodactyl\Models\WebhookEndpoint;
use Pterodactyl\Jobs\CheckSoftwareUpdates;
use Pterodactyl\Services\Updates\ReleaseNotes;
use Pterodactyl\Services\Updates\ReleaseCatalog;
use Pterodactyl\Services\Updates\SoftwareMonitor;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Integrations\IntegrationSettings;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;

uses(DatabaseTransactions::class);

beforeEach(function () {
    // Preserve the surrounding test transaction when exercising validation errors.
    app()->instance(Illuminate\Contracts\Debug\ExceptionHandler::class, new class(app()) extends Pterodactyl\Exceptions\Handler {
        public function render($request, Throwable $e): Symfony\Component\HttpFoundation\Response
        {
            return (new ReflectionMethod(Illuminate\Foundation\Exceptions\Handler::class, 'render'))->invoke($this, $request, $e);
        }
    });
    config()->set('pterodactyl.auth.2fa_required', 0);
    Cache::flush();
    Queue::fake();
    Http::preventStrayRequests();
    $this->settings = app(IntegrationSettings::class);
    $this->settings->set('updates:enabled', '0');
    $this->settings->set('updates:daemon_products', '{}');
});

test('update configuration is admin only validates node mappings and checks queue without blocking the request', function () {
    $server = $this->createServerModel();
    $user = User::factory()->create(['root_admin' => false]);
    $admin = User::factory()->create(['root_admin' => true]);
    $this->actingAs($user)->get('/admin/settings/updates')->assertForbidden();
    $this->actingAs($admin)->get('/admin/settings/updates')->assertOk()->assertSee('Not checked yet');
    $payload = ['enabled' => 1, 'products' => [$server->node_id => 'manta'], 'current_password' => 'password'];
    $this->patchJson('/admin/settings/updates', array_replace($payload, ['current_password' => 'wrong']))->assertUnprocessable();
    $this->patchJson('/admin/settings/updates', array_replace($payload, ['products' => [99999999 => 'auto']]))->assertUnprocessable();
    $this->patchJson('/admin/settings/updates', array_replace($payload, ['products' => [$server->node_id => 'unknown']]))->assertUnprocessable();
    $this->patchJson('/admin/settings/updates', $payload)->assertRedirect('/admin/settings/updates');
    expect($this->settings->get('updates:enabled'))->toBe('1');
    $this->post('/admin/settings/updates/check')->assertRedirect('/admin/settings/updates');
    Queue::assertPushed(CheckSoftwareUpdates::class, fn ($job) => $job->queue === 'low');
    Http::assertNothingSent();
    $monitor = Mockery::mock(SoftwareMonitor::class);
    $monitor->shouldReceive('check')->once()->with(true);
    (new CheckSoftwareUpdates())->handle($monitor);
    $this->patch('/admin/settings/updates', ['enabled' => 0, 'current_password' => 'password'])->assertRedirect();
});

test('release catalog uses official repositories caches results and builds trusted links', function () {
    Http::fake(['api.github.com/*' => Http::response(['tag_name' => 'v1.2.3', 'body' => '# Notes', 'html_url' => 'https://evil.example.com'], 200)]);
    $catalog = app(ReleaseCatalog::class);
    $release = $catalog->latest('panel');
    expect($release)->toBe(['tag' => 'v1.2.3', 'notes' => '# Notes', 'url' => 'https://github.com/Aquadactyl/aquadactyl/releases/tag/v1.2.3', 'error' => null]);
    $catalog->latest('panel');
    Http::assertSentCount(1);
});

test('missing releases drafts malformed oversized and unavailable responses are handled safely', function ($body, int $status, bool $error) {
    Http::fake(['*' => Http::response($body, $status)]);
    $result = app(ReleaseCatalog::class)->latest('wings');
    expect($result['tag'])->toBeNull()->and($result['error'] !== null)->toBe($error);
})->with([
    [[], 404, false], [[], 500, true], ['bad json', 200, true], [['tag_name' => 'dev'], 200, true], [['tag_name' => '1.2.3', 'draft' => true], 200, false], [['tag_name' => '1.2.3', 'prerelease' => true], 200, false], [str_repeat('x', 1048577), 200, true],
]);

test('release notes support nonstring bodies', function () {
    Http::fake(['*' => Http::response(['tag_name' => '1.2.3', 'body' => []], 200)]);
    expect(app(ReleaseCatalog::class)->latest('manta')['notes'])->toBe('');
});

test('stalled release streams and network failures are bounded and sanitized', function (string $failure) {
    if ($failure === 'network') {
        Http::fake(fn () => throw new RuntimeException('credential'));
    } else {
        $stream = GuzzleHttp\Psr7\FnStream::decorate(GuzzleHttp\Psr7\Utils::streamFor(''), ['eof' => fn () => false, 'read' => fn ($length) => '']);
        Http::fake(fn () => Http::response($stream, 200));
    }
    expect(app(ReleaseCatalog::class)->latest('manta')['error'])->not->toBeNull();
})->with(['network', 'stalled']);

test('available notifications deduplicate and installed notifications require an actual version change', function () {
    WebhookEndpoint::create(['name' => 'Updates', 'format' => 'json', 'url' => 'https://example.com/hook', 'signing_secret' => str_repeat('s', 32), 'events' => ['updates.available', 'updates.installed'], 'enabled' => true]);
    Http::fake(fn () => Http::response(['tag_name' => '1.2.3', 'body' => '**Release**'], 200));
    $monitor = app(SoftwareMonitor::class);
    $monitor->observe('panel', 'panel', '1.2.2', null);
    $monitor->observe('panel', 'panel', '1.2.2', null);
    expect(WebhookDelivery::where('event_type', 'updates.available')->count())->toBe(1)->and(WebhookDelivery::where('event_type', 'updates.installed')->count())->toBe(0);
    $monitor->observe('panel', 'panel', '1.2.3', null);
    expect(WebhookDelivery::where('event_type', 'updates.installed')->count())->toBe(1);
    $monitor->observe('panel', 'manta', '1.2.3', null);
    expect(WebhookDelivery::where('event_type', 'updates.installed')->count())->toBe(1);
    expect(SoftwareUpdate::where('component', 'panel')->value('release_notes'))->toBe('**Release**');
    $response = $this->actingAs(User::factory()->create(['root_admin' => true]))->get('/admin/settings/updates')->assertOk();
    $response->assertSee('<strong>Release</strong>', false);
    $this->get('/admin')->assertOk()->assertSee('Latest stable release');
});

test('version comparisons do not guess ordering for custom or development builds', function (string $installed, string $latest, bool $expected) {
    expect(SoftwareMonitor::newer($installed, $latest))->toBe($expected);
})->with([['1.2.2', 'v1.2.3', true], ['v1.2.3', '1.2.3', false], ['2.0.0', '1.2.3', false], ['canary+abcdef012345', '1.2.3', false], ['custom', '1.2.3', false], ['1.2.3', 'dev', false]]);

test('disabled automatic checks do no work while forced checks probe nodes with product overrides and preserve offline versions', function () {
    $monitor = app(SoftwareMonitor::class);
    $monitor->check();
    expect(SoftwareUpdate::count())->toBe(0);
    Http::assertNothingSent();
    $server = $this->createServerModel();
    $node = Node::findOrFail($server->node_id);
    Http::fake(['*' => Http::response([], 404)]);
    $probe = [200, json_encode(['version' => '1.2.3-manta'])];
    // All nodes get the same phase response, independent of other integration fixtures.
    $client = new Client(['handler' => function () use (&$probe) {
        return $probe instanceof Throwable ? GuzzleHttp\Promise\Create::rejectionFor($probe) : GuzzleHttp\Promise\Create::promiseFor(new Response($probe[0], [], $probe[1]));
    }]);
    $repository = Mockery::mock(DaemonConfigurationRepository::class);
    $repository->shouldReceive('setNode')->andReturnSelf();
    $repository->shouldReceive('getHttpClient')->andReturn($client);
    app()->instance(DaemonConfigurationRepository::class, $repository);
    $monitor->check(true);
    expect(SoftwareUpdate::where('component', 'node:' . $node->id)->first()->product)->toBe('manta');
    $this->settings->set('updates:daemon_products', json_encode([$node->id => 'manta']));
    $this->settings->set('updates:enabled', '1');
    $probe = [200, json_encode(['version' => '1.2.3'])];
    $monitor->check();
    foreach ([[200, 'bad-json'], [500, '{}'], new GuzzleHttp\Exception\ConnectException('offline', new GuzzleHttp\Psr7\Request('GET', 'http://node'))] as $probe) {
        $monitor->check(true);
    }
    $state = SoftwareUpdate::where('component', 'node:' . $node->id)->first();
    expect($state->installed_version)->toBe('1.2.3')->and($state->last_error)->not->toBeNull()->and($state->node->id)->toBe($node->id);
    $repository->shouldReceive('getHttpClient')->andThrow(new RuntimeException('unconfigured'));
    // A separate mock ensures a synchronous client failure cannot abort the panel check.
    $failing = Mockery::mock(DaemonConfigurationRepository::class);
    $failing->shouldReceive('setNode')->andThrow(new RuntimeException('unconfigured'));
    app()->instance(DaemonConfigurationRepository::class, $failing);
    $this->artisan('p:updates:check', ['--force' => true])->assertSuccessful();
});

test('bundled notes identify canary builds select installed sections and strip unsafe HTML', function () {
    $path = sys_get_temp_dir() . '/aquadactyl-notes-' . bin2hex(random_bytes(6));
    mkdir($path);
    $original = app()->basePath();
    try {
        app()->setBasePath($path);
        $notes = app(ReleaseNotes::class);
        config()->set('app.version', 'canary');
        View::share('appVersion', 'unknown');
        expect($notes->installed())->toBe('')->and($notes->installedVersion())->toBe('canary');
        View::share('appVersion', str_repeat('a', 40));
        expect($notes->installedVersion())->toBe('canary+' . str_repeat('a', 12));
        file_put_contents($path . '/.aquadactyl-build', str_repeat('b', 64));
        expect($notes->installedVersion())->toBe('canary+' . str_repeat('b', 12));
        file_put_contents($path . '/CHANGELOG.md', "# Changes\n## Unreleased (Aquadactyl)\nCanary notes\n## 1.2.3\nStable notes\n");
        expect($notes->installed())->toBe('Canary notes');
        config()->set('app.version', 'v1.2.3');
        expect($notes->installedVersion())->toBe('v1.2.3')->and($notes->installed())->toBe('Stable notes');
        config()->set('app.version', '0.0.0');
        expect($notes->installed())->toBe('');
    } finally {
        app()->setBasePath($original);
        foreach (glob($path . '/*') as $file) {
            unlink($file);
        }
        if (is_file($path . '/.aquadactyl-build')) {
            unlink($path . '/.aquadactyl-build');
        }
        rmdir($path);
    }
    $html = view('admin.partials.update-notes', ['installedNotes' => "<script>alert(1)</script>\n\n[bad](javascript:alert(1)) **Good**"])->render();
    expect($html)->not->toContain('<script', 'href="javascript:')->toContain('<strong>Good</strong>');
});
