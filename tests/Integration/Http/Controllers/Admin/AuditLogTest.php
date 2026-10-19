<?php

use Pterodactyl\Models\User;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Models\ActivityLog;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set('pterodactyl.auth.2fa_required', 0);
    $this->admin = User::factory()->create(['root_admin' => true]);
    $this->user = User::factory()->create(['username' => 'auditvisibleuser', 'email' => 'auditvisible@example.test']);
    $this->actingAs($this->admin);
});

test('admin mutations are audited without credential or request payload values', function () {
    $this->post('/admin/setup/locations', ['short' => 'audit-location', 'long' => 'Visible location', 'password' => 'private-password', 'api_token' => 'private-token']);
    $entry = ActivityLog::forEvent('admin:request')->latest('id')->firstOrFail();
    expect($entry->actor_id)->toBe($this->admin->id)->and($entry->properties->get('route'))->toBe('admin.setup.locations');
    expect($entry->properties->toJson())->not->toContain('private-password', 'private-token', 'Visible location');
    $this->get('/admin/audit-logs')->assertOk()->assertSee('admin:request')->assertSee('admin.setup.locations')->assertDontSee('private-password')->assertDontSee('private-token');
});

test('the admin audit page is read only and inaccessible to non administrators', function () {
    $before = ActivityLog::count();
    $this->get('/admin/audit-logs?event=nonexistent-empty-fixture')->assertOk()->assertSee('No matching activity');
    expect(ActivityLog::count())->toBe($before);
    $this->actingAs($this->user)->getJson('/admin/audit-logs')->assertForbidden();
});

test('audit filters combine actor event date and IP and classify administrator user and system entries', function (string $kind) {
    Activity::event('server:power.start')->actor($this->user)->property('hidden-secret', 'never-display')->log();
    Activity::event('admin:request')->actor($this->admin)->property(['route' => 'admin.nodes.update', 'method' => 'PATCH', 'status' => 302])->log();
    Activity::event('system:fixture')->anonymous()->log();
    $expected = ['admin' => 'admin:request', 'user' => 'server:power.start', 'system' => 'system:fixture'][$kind];
    $query = ['kind' => $kind, 'from' => now()->format('Y-m-d'), 'to' => now()->format('Y-m-d'), 'ip' => '127.0.0.1'];
    if ($kind === 'user') {
        $query += ['actor' => 'auditvisible@example.test', 'event' => 'server:power'];
    }
    if ($kind === 'admin') {
        $query['event'] = 'nodes';
    }
    $response = $this->get('/admin/audit-logs?' . http_build_query($query))->assertOk()->assertSee($expected)->assertDontSee('never-display');
    foreach (array_diff(['admin:request', 'server:power.start', 'system:fixture'], [$expected]) as $other) {
        $response->assertDontSee($other);
    }
})->with(['admin', 'user', 'system']);

test('a single end date filter is valid and malformed filters are rejected', function () {
    $this->get('/admin/audit-logs?to=' . now()->format('Y-m-d'))->assertOk();
    $this->getJson('/admin/audit-logs?from=invalid')->assertUnprocessable();
});

test('audit pages escape hostile labels and do not render arbitrary activity properties', function () {
    Activity::event('admin:request')->actor($this->admin)->property(['route' => '<script>alert(1)</script>', 'method' => ['invalid'], 'status' => 422, 'password' => 'must-never-display'])->log();
    $this->get('/admin/audit-logs')->assertOk()->assertSee('&lt;script&gt;alert(1)&lt;/script&gt;', false)->assertDontSee('<script>alert(1)', false)->assertDontSee('must-never-display');
});

test('audit pagination is bounded and retains active filters', function () {
    for ($index = 0; $index < 51; ++$index) {
        Activity::event('user:audit-fixture')->actor($this->user)->log();
    }
    $response = $this->get('/admin/audit-logs?kind=user')->assertOk();
    expect($response->viewData('entries')->count())->toBe(50);
    expect($response->viewData('entries')->nextPageUrl())->toContain('kind=user');
});

test('admin auditing captures failed responses without exposing exception messages', function (string $failure, int $status) {
    $request = Illuminate\Http\Request::create('/admin/test-failure', 'POST', ['password' => 'private-secret']);
    $request->setUserResolver(fn () => $this->admin);
    $route = new Illuminate\Routing\Route(['POST'], 'admin/test-failure', fn () => null);
    $route->bind($request);
    $route->name('admin.fixture-failure');
    $request->setRouteResolver(fn () => $route);
    $exception = match ($failure) {
        'http' => new Symfony\Component\HttpKernel\Exception\HttpException(403, 'private-secret'),
        'validation' => Illuminate\Validation\ValidationException::withMessages(['password' => 'private-secret']),
        default => new RuntimeException('private-secret'),
    };
    expect(fn () => app(Pterodactyl\Http\Middleware\Activity\LogAdminActions::class)->handle($request, fn () => throw $exception))->toThrow($exception::class);
    $log = ActivityLog::forEvent('admin:request')->latest('id')->firstOrFail();
    expect($log->properties->get('status'))->toBe($status)->and($log->properties->toJson())->not->toContain('private-secret');
})->with([['http', 403], ['validation', 422], ['runtime', 500]]);

test('audit middleware skips non administrator writes and safely ignores unmapped extension models', function () {
    $request = Illuminate\Http\Request::create('/fixture', 'POST');
    $request->setUserResolver(fn () => $this->user);
    $middleware = app(Pterodactyl\Http\Middleware\Activity\LogAdminActions::class);
    $before = ActivityLog::count();
    $middleware->handle($request, fn () => response('', 204));
    expect(ActivityLog::count())->toBe($before);
    $request->setUserResolver(fn () => $this->admin);
    $route = new Illuminate\Routing\Route(['POST'], 'admin/extension/{item}', fn () => null);
    $route->bind($request);
    $route->setParameter('item', new class extends Illuminate\Database\Eloquent\Model {});
    $route->setParameter('user', $this->user);
    $request->setRouteResolver(fn () => $route);
    $middleware->handle($request, fn () => response('', 204));
    $log = ActivityLog::forEvent('admin:request')->latest('id')->firstOrFail();
    expect($log->subjects->count())->toBe(1)->and($log->subjects->first()->subject_id)->toBe($this->user->id);
});
