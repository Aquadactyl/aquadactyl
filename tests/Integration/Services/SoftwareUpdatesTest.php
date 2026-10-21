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

test('panel release notes match installed channels and exact tags instead of the latest stable release', function (string $version, string $tag) {
    Http::fake(fn () => Http::response(['tag_name' => $tag, 'body' => '**Matching notes**', 'prerelease' => true, 'html_url' => 'https://evil.example.com'], 200));
    $catalog = app(ReleaseCatalog::class);
    $release = $catalog->forPanelVersion($version);
    expect($release)->toBe(['tag' => $tag, 'notes' => '**Matching notes**', 'url' => 'https://github.com/Aquadactyl/aquadactyl/releases/tag/' . $tag, 'error' => null]);
    expect($catalog->forPanelVersion($version))->toBe($release);
    Http::assertSentCount(1);
    Http::assertSent(fn ($request) => $request->url() === 'https://api.github.com/repos/Aquadactyl/aquadactyl/releases/tags/' . $tag);
})->with([['canary', 'canary'], ['canary+abcdef012345', 'canary'], ['v1', 'v1'], ['1.2.3', '1.2.3'], ['v1.2.3-rc.1', 'v1.2.3-rc.1']]);

test('version matching only tries the alternate leading v spelling when a release is absent', function (string $version, string $alternate) {
    Http::fake(fn ($request) => Http::response(str_ends_with($request->url(), '/' . $alternate) ? ['tag_name' => $alternate, 'body' => 'Correct version'] : [], str_ends_with($request->url(), '/' . $alternate) ? 200 : 404));
    expect(app(ReleaseCatalog::class)->forPanelVersion($version)['tag'])->toBe($alternate);
    Http::assertSentCount(2);
})->with([['v1.2.3', '1.2.3'], ['1.2.3', 'v1.2.3']]);

test('custom versions and unsafe or oversized tags never become release request paths', function (string $version) {
    expect(app(ReleaseCatalog::class)->forPanelVersion($version)['tag'])->toBeNull();
    Http::assertNothingSent();
})->with(['custom', '../../latest', 'canary+not-a-hash', 'v1?redirect=other', 'v' . str_repeat('1', 100)]);

test('missing or invalid matching releases cannot substitute another channel or a draft', function ($body, int $status, bool $error, int $requests) {
    Http::fake(fn ($request) => Http::response(($body['draft'] ?? false) ? array_replace($body, ['tag_name' => basename($request->url())]) : $body, $status));
    $release = app(ReleaseCatalog::class)->forPanelVersion('v1.2.3');
    expect($release['tag'])->toBeNull()->and($release['error'] !== null)->toBe($error);
    Http::assertSentCount($requests);
})->with([[[], 404, false, 2], [[], 500, true, 1], [['tag_name' => 'canary'], 200, true, 1], [['tag_name' => 'v1.2.3', 'draft' => true], 200, false, 2]]);

test('matching canary descriptions refresh after the cache expires and remain bounded', function () {
    $description = str_repeat('a', 17000);
    Http::fake(function () use (&$description) {
        return Http::response(['tag_name' => 'canary', 'body' => $description], 200);
    });
    $catalog = app(ReleaseCatalog::class);
    expect($catalog->forPanelVersion('canary')['notes'])->toBe(str_repeat('a', 16000));
    $description = 'Updated push description';
    $this->travel(61)->minutes();
    expect($catalog->forPanelVersion('canary')['notes'])->toBe($description);
    Http::assertSentCount(2);
    $this->travelBack();
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
    config()->set('app.version', '1.2.3');
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

test('installed versions identify fingerprinted canary builds without reading bundled notes', function () {
    $path = sys_get_temp_dir() . '/aquadactyl-notes-' . bin2hex(random_bytes(6));
    mkdir($path);
    $original = app()->basePath();
    try {
        app()->setBasePath($path);
        $notes = app(ReleaseNotes::class);
        config()->set('app.version', 'canary');
        View::share('appVersion', 'unknown');
        expect($notes->installedVersion())->toBe('canary');
        View::share('appVersion', str_repeat('a', 40));
        expect($notes->installedVersion())->toBe('canary+' . str_repeat('a', 12));
        file_put_contents($path . '/.aquadactyl-build', str_repeat('b', 64));
        expect($notes->installedVersion())->toBe('canary+' . str_repeat('b', 12));
        config()->set('app.version', 'v1.2.3');
        expect($notes->installedVersion())->toBe('v1.2.3');
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
});

test('background checks persist channel specific descriptions while admin views render safe collapsed notes without contacting GitHub', function () {
    config()->set('app.version', 'canary');
    Http::fake(fn ($request) => Http::response(str_ends_with($request->url(), '/latest') ? ['tag_name' => 'v1.2.3', 'body' => 'Stable-only notes'] : ['tag_name' => 'canary', 'prerelease' => true, 'body' => "## Canary changes\n\n<script>window.executed=true</script>\n\n[bad](javascript:alert(1)) **Good**"], 200));
    $version = app(ReleaseNotes::class)->installedVersion();
    app(SoftwareMonitor::class)->observe('panel', 'panel', $version, null);
    $state = SoftwareUpdate::where('component', 'panel')->firstOrFail();
    expect($state->installed_release['tag'])->toBe('canary')->and($state->latest_version)->toBe('v1.2.3');
    Http::assertSentCount(2);
    Http::fake(fn () => throw new RuntimeException('Admin page must not contact GitHub'));
    $this->actingAs(User::factory()->create(['root_admin' => true]));
    foreach (['/admin', '/admin/settings/updates'] as $path) {
        $response = $this->get($path)->assertOk()->assertSee('<strong>Good</strong>', false)->assertSee('Canary changes')->assertDontSee('Stable-only notes');
        expect($response->getContent())->toContain('<details class="panel-update-notes">', '<summary class="panel-update-notes-header">')
            ->not->toContain('<details class="panel-update-notes" open', 'href="javascript:', '<script>window.executed');
        $footer = explode('<footer', $response->getContent(), 2)[1];
        expect($footer)->not->toContain('panel-update-notes', 'Installed version notes');
    }
    Http::assertNothingSent();
    config()->set('app.version', 'v2.0.0');
    $this->get('/admin')->assertOk()->assertDontSee('Canary changes')->assertSee('No GitHub release description');
});

test('a missing canary release does not display the latest stable description and release errors are recorded', function () {
    $missing = true;
    Http::fake(function ($request) use (&$missing) {
        return Http::response(str_ends_with($request->url(), '/latest') ? ['tag_name' => 'v1.0.0', 'body' => 'Wrong channel notes'] : [], str_ends_with($request->url(), '/latest') ? 200 : ($missing ? 404 : 503));
    });
    config()->set('app.version', 'canary');
    $version = app(ReleaseNotes::class)->installedVersion();
    $monitor = app(SoftwareMonitor::class);
    $monitor->observe('panel', 'panel', $version, null);
    $this->actingAs(User::factory()->create(['root_admin' => true]))->get('/admin')->assertOk()->assertSee('No GitHub release description')->assertDontSee('Wrong channel notes');
    Cache::flush();
    $missing = false;
    $monitor->observe('panel', 'panel', $version, null);
    expect(SoftwareUpdate::where('component', 'panel')->firstOrFail()->last_error)->toBe('Release information is temporarily unavailable.');
    $this->get('/admin')->assertOk()->assertSee('Release information is temporarily unavailable.');
});
