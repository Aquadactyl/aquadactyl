<?php

use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Pterodactyl\Models\AuditLog;
use Illuminate\Support\Facades\Log;
use Pterodactyl\Models\ActivityLog;
use Pterodactyl\Services\Activity\ActivityLogService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Activity\ActivityLogBatchService;
use Pterodactyl\Services\Activity\ActivityLogTargetableService;

uses(DatabaseTransactions::class);

test('activity batches retain their identity through nesting and clear it after completion', function () {
    $batch = app(ActivityLogBatchService::class);
    expect($batch->uuid())->toBeNull();
    $result = $batch->transaction(function ($uuid) use ($batch) {
        expect($uuid)->toMatch('/^[a-f0-9-]{36}$/');
        $batch->transaction(function ($nested) use ($uuid) { expect($nested)->toBe($uuid); });
        expect($batch->uuid())->toBe($uuid);

        return 'completed';
    });
    expect($result)->toBe('completed')->and($batch->uuid())->toBeNull();
    $batch->end();
    expect($batch->uuid())->toBeNull();
});

test('activity logging handles anonymous actors deduplicates subjects and resets its reusable state', function () {
    $server = $this->createServerModel();
    $this->actingAs($server->user);
    $logger = app(ActivityLogService::class)->event('coverage:anonymous')->anonymous()->description('Coverage description')->subject($server, null, $server)->withRequestMetadata();
    $record = $logger->log();
    expect($record->actor_id)->toBeNull()->and($record->description)->toBe('Coverage description')->and($record->subjects)->toHaveCount(1);
    $logger->event('coverage:clone')->property('one', 1);
    $clone = $logger->clone();
    $logger->reset();
    $second = $clone->log('Cloned event');
    expect($second->event)->toBe('coverage:clone')->and($second->properties->get('one'))->toBe(1);
    expect(ActivityLog::forActor($server->user)->forEvent('coverage:clone')->count())->toBe(1);
});

test('failed nested activity batches restore the parent and clear state after the outer failure', function () {
    $batch = app(ActivityLogBatchService::class);
    expect(fn () => $batch->transaction(function ($uuid) use ($batch) {
        expect(fn () => $batch->transaction(fn () => throw new RuntimeException('inner failure')))->toThrow(RuntimeException::class);
        expect($batch->uuid())->toBe($uuid);
        throw new RuntimeException('outer failure');
    }))->toThrow(RuntimeException::class, 'outer failure');
    expect($batch->uuid())->toBeNull();
});

test('production logging failures are reported without breaking the caller', function () {
    config()->set('app.env', 'production');
    $logger = Mockery::mock(ActivityLogService::class, [app('auth'), app(ActivityLogBatchService::class), app(ActivityLogTargetableService::class), app('db')->connection()])->makePartial()->shouldAllowMockingProtectedMethods();
    $logger->shouldReceive('save')->once()->andThrow(new RuntimeException('logging unavailable'));
    Log::shouldReceive('error')->once()->with(Mockery::type(RuntimeException::class));
    expect($logger->event('coverage:failed')->log()->event)->toBe('coverage:failed');
});

test('targeted logging state can be cleared between requests and pruning requires explicit retention', function () {
    $target = app(ActivityLogTargetableService::class);
    $target->setActor(User::factory()->create());
    $target->setSubject($this->createServerModel());
    $target->setApiKeyId(1);
    $target->reset();
    expect($target->actor())->toBeNull()->and($target->subject())->toBeNull()->and($target->apiKeyId())->toBeNull();
    config()->set('activity.prune_days', null);
    expect(fn () => (new ActivityLog())->prunable())->toThrow(LogicException::class);
    config()->set('activity.prune_days', 30);
    expect((new ActivityLog())->prunable()->toSql())->toContain('timestamp');
});

test('legacy audit metadata records request details and supports anonymous system events', function (bool $system) {
    $user = User::factory()->create();
    $this->actingAs($user);
    $request = Request::create('/audit', 'GET', [], [], [], ['REMOTE_ADDR' => '192.0.2.50', 'HTTP_USER_AGENT' => 'Coverage client']);
    $request->setUserResolver(fn () => $user);
    $this->app->instance('request', $request);
    $record = AuditLog::instance('coverage:audit', ['resource' => 'server'], $system);
    expect($record->uuid)->toMatch('/^[a-f0-9-]{36}$/')->and($record->is_system)->toBe($system)->and($record->metadata)->toBe(['resource' => 'server']);
    expect($record->user_id)->toBe($system ? null : $user->id)->and($record->device)->toBe($system ? [] : ['ip_address' => '192.0.2.50', 'user_agent' => 'Coverage client']);
    expect($record->user()->getRelated())->toBeInstanceOf(User::class)->and($record->server()->getRelated())->toBeInstanceOf(Pterodactyl\Models\Server::class);
})->with([true, false]);

test('development audit storage failures are raised for troubleshooting', function () {
    config()->set('app.env', 'testing');
    $logger = Mockery::mock(ActivityLogService::class, [app('auth'), app(ActivityLogBatchService::class), app(ActivityLogTargetableService::class), app('db')->connection()])->makePartial()->shouldAllowMockingProtectedMethods();
    $logger->expects('save')->andThrow(new RuntimeException('audit storage unavailable'));
    expect(fn () => $logger->event('coverage:failed')->log())->toThrow(RuntimeException::class, 'audit storage unavailable');
});

test('activity logs relate API keys and subjects and identify server events', function () {
    $server = $this->createServerModel();
    $key = Pterodactyl\Models\ApiKey::factory()->create(['user_id' => $server->owner_id]);
    $record = app(ActivityLogService::class)->event('server:coverage')->subject($server)->log();
    $record->forceFill(['api_key_id' => $key->id])->save();
    expect($record->apiKey->id)->toBe($key->id)->and($record->subjects->first()->activityLog->id)->toBe($record->id);
    expect((new Pterodactyl\Events\ActivityLogged($record))->isServerEvent())->toBeTrue();
    expect((new Pterodactyl\Events\Server\Saving($server))->server)->toBe($server);
    Pterodactyl\Facades\LogBatch::start();
    expect(Pterodactyl\Facades\LogBatch::uuid())->not->toBeNull();
    Pterodactyl\Facades\LogBatch::end();
});

test('activity date filters remain usable when a configured timezone is invalid', function () {
    config()->set('app.timezone', 'Invalid/Timezone');
    $query = Spatie\QueryBuilder\QueryBuilder::for(ActivityLog::class);
    $before = $query->toSql();
    $filter = collect(app(Pterodactyl\Services\Activity\ActivityLogFilterService::class)->allowedFilters(User::factory()->make()))->first(fn ($item) => $item->getName() === 'date');
    $filter->filter($query, '2026-10-13');
    expect($query->toSql())->toBe($before);
});
