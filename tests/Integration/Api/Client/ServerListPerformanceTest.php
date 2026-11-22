<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Subuser;
use Illuminate\Support\Facades\DB;
use Pterodactyl\Models\Permission;
use Pterodactyl\Models\EggVariable;
use Pterodactyl\Models\ServerVariable;
use Pterodactyl\Models\SoftwareUpdate;
use Pterodactyl\Services\Servers\ServerListRelationsService;

test('list variables retain distinct overrides and defaults for servers sharing an egg', function () {
    $user = User::factory()->create();
    $first = $this->createServerModel(['owner_id' => $user->id, 'startup' => '{{BENCH_VALUE}} {{BENCH_SECRET}}']);
    $egg = $this->cloneEggAndVariables($first->egg);
    $first->update(['egg_id' => $egg->id]);
    $second = $this->createServerModel(['owner_id' => $user->id, 'egg_id' => $first->egg_id, 'startup' => '{{BENCH_VALUE}} {{BENCH_SECRET}}']);
    $third = $this->createServerModel(['owner_id' => $user->id, 'egg_id' => $first->egg_id, 'startup' => '{{BENCH_VALUE}} {{BENCH_SECRET}}']);
    SoftwareUpdate::create(['component' => 'node:' . $first->node_id, 'node_id' => $first->node_id, 'product' => 'manta', 'installed_version' => '1.0-beta']);
    $visible = EggVariable::factory()->create(['egg_id' => $first->egg_id, 'env_variable' => 'BENCH_VALUE', 'default_value' => 'fallback', 'user_viewable' => true]);
    $secret = EggVariable::factory()->create(['egg_id' => $first->egg_id, 'env_variable' => 'BENCH_SECRET', 'default_value' => 'private-default', 'user_viewable' => false]);
    ServerVariable::query()->create(['server_id' => $first->id, 'variable_id' => $visible->id, 'variable_value' => 'first-value']);
    ServerVariable::query()->create(['server_id' => $second->id, 'variable_id' => $visible->id, 'variable_value' => '']);
    ServerVariable::query()->create(['server_id' => $first->id, 'variable_id' => $secret->id, 'variable_value' => 'private-override']);

    $response = $this->actingAs($user)->getJson('/api/client')->assertOk();
    $servers = collect($response->json('data'))->keyBy('attributes.uuid');
    expect($servers[$first->uuid]['attributes']['invocation'])->toBe('first-value [hidden]');
    expect($servers[$second->uuid]['attributes']['invocation'])->toBe(' [hidden]');
    expect($servers[$third->uuid]['attributes']['invocation'])->toBe('fallback [hidden]');
    expect($servers[$first->uuid]['attributes']['daemon_product'])->toBe('manta');
    expect($servers[$third->uuid]['attributes']['daemon_product'])->toBe('wings');
    foreach ($servers as $server) {
        expect(collect($server['attributes']['relationships']['variables']['data'])->pluck('attributes.env_variable')->all())->not->toContain('BENCH_SECRET');
        expect($server['attributes']['relationships']['allocations']['data'][0]['attributes']['is_default'])->toBeTrue();
    }
});

test('batch loading does not expose startup variables or allocation notes to a restricted subuser', function () {
    $server = $this->createServerModel(['startup' => '{{BENCH_VALUE}}']);
    $egg = $this->cloneEggAndVariables($server->egg);
    $server->update(['egg_id' => $egg->id]);
    $user = User::factory()->create();
    Subuser::query()->create(['server_id' => $server->id, 'user_id' => $user->id, 'permissions' => [Permission::ACTION_CONTROL_CONSOLE]]);
    $variable = EggVariable::factory()->create(['egg_id' => $server->egg_id, 'env_variable' => 'BENCH_VALUE', 'user_viewable' => true]);
    ServerVariable::query()->create(['server_id' => $server->id, 'variable_id' => $variable->id, 'variable_value' => 'do-not-disclose']);
    $server->allocation->update(['notes' => 'private-allocation-note']);

    $response = $this->actingAs($user)->getJson('/api/client')->assertOk();
    $response->assertJsonPath('data.0.attributes.invocation', '[hidden]');
    $response->assertJsonPath('data.0.attributes.user_permissions', [Permission::ACTION_CONTROL_CONSOLE]);
    $response->assertJsonPath('data.0.attributes.relationships.allocations.data.0.attributes.notes', null);
    expect($response->getContent())->not->toContain('do-not-disclose', 'private-allocation-note');
});

test('list query count stays bounded as the page grows', function (bool $includeSubusers) {
    $user = User::factory()->create();
    for ($i = 0; $i < 12; ++$i) {
        $server = $this->createServerModel(['owner_id' => $user->id]);
        foreach (User::factory()->count(2)->create() as $member) {
            Subuser::query()->create(['server_id' => $server->id, 'user_id' => $member->id, 'permissions' => [Permission::ACTION_CONTROL_CONSOLE]]);
        }
    }
    $suffix = $includeSubusers ? '&include=subusers' : '';
    $this->actingAs($user)->getJson('/api/client?per_page=1' . $suffix)->assertOk();
    DB::enableQueryLog();
    DB::flushQueryLog();
    $this->getJson('/api/client?per_page=1' . $suffix)->assertOk();
    $small = count(DB::getQueryLog());
    DB::flushQueryLog();
    $this->getJson('/api/client?per_page=12' . $suffix)->assertOk()->assertJsonCount(12, 'data');
    $large = count(DB::getQueryLog());
    // Pagination must not first fetch all accessible server rows into PHP.
    $enumerations = collect(DB::getQueryLog())->filter(fn (array $query) => str_starts_with($query['query'], 'select `servers`.* from `servers` left join `subusers`')
    );
    DB::disableQueryLog();

    expect($large)->toBeLessThanOrEqual($small + 2);
    expect($enumerations)->toBeEmpty();
})->with([false, true]);

test('owned and administrator lists avoid fetching memberships unless explicitly included', function (bool $administrator) {
    $user = User::factory()->create(['root_admin' => $administrator]);
    $server = $this->createServerModel($administrator ? [] : ['owner_id' => $user->id]);
    foreach (User::factory()->count(3)->create() as $member) {
        Subuser::query()->create(['server_id' => $server->id, 'user_id' => $member->id, 'permissions' => [Permission::ACTION_CONTROL_CONSOLE]]);
    }
    $url = '/api/client' . ($administrator ? '?type=admin-all' : '');
    DB::enableQueryLog();
    DB::flushQueryLog();
    try {
        $this->actingAs($user)->getJson($url)->assertOk()->assertJsonPath('data.0.attributes.user_permissions.0', '*');
        $queries = collect(DB::getQueryLog())->filter(fn (array $query) => str_contains($query['query'], 'from `subusers`'));
        expect($queries)->toBeEmpty();
    } finally {
        DB::disableQueryLog();
    }
})->with([false, true]);

test('shared lists hydrate only the requesting membership while explicit includes remain complete', function () {
    $user = User::factory()->create();
    $server = $this->createServerModel();
    $permissions = [Permission::ACTION_CONTROL_CONSOLE, Permission::ACTION_USER_READ];
    Subuser::query()->create(['server_id' => $server->id, 'user_id' => $user->id, 'permissions' => $permissions]);
    foreach (User::factory()->count(4)->create() as $member) {
        Subuser::query()->create(['server_id' => $server->id, 'user_id' => $member->id, 'permissions' => [Permission::ACTION_STARTUP_READ]]);
    }
    $servers = Server::query()->whereKey($server->id)->get();
    app(ServerListRelationsService::class)->handle($servers, $user);
    expect($servers->first()->subusers->pluck('user_id')->all())->toBe([$user->id]);
    $this->actingAs($user)->getJson('/api/client')->assertOk()->assertJsonPath('data.0.attributes.user_permissions', $permissions);
    // The service's previous one-argument use remains compatible for integrations.
    $fresh = Server::query()->whereKey($server->id)->get();
    app(ServerListRelationsService::class)->handle($fresh);
    expect($fresh->first()->subusers)->toHaveCount(5);
});

test('explicit subuser includes preserve the complete authorized list', function (string $scope, string $include) {
    $user = User::factory()->create(['root_admin' => $scope === 'admin']);
    $server = $this->createServerModel($scope === 'owner' ? ['owner_id' => $user->id] : []);
    $count = 3;
    foreach (User::factory()->count($count)->create() as $member) {
        Subuser::query()->create(['server_id' => $server->id, 'user_id' => $member->id, 'permissions' => [Permission::ACTION_CONTROL_CONSOLE]]);
    }
    if ($scope === 'shared') {
        Subuser::query()->create(['server_id' => $server->id, 'user_id' => $user->id, 'permissions' => [Permission::ACTION_USER_READ]]);
        ++$count;
    }
    $url = '/api/client?include=' . $include . ($scope === 'admin' ? '&type=admin-all' : '');
    $this->actingAs($user)->getJson($url)->assertOk()->assertJsonCount($count, 'data.0.attributes.relationships.subusers.data');
})->with(['owner', 'admin', 'shared'])->with(['subusers', 'subusers.user']);

test('empty server list batching performs no relationship queries', function () {
    DB::enableQueryLog();
    DB::flushQueryLog();
    try {
        app(ServerListRelationsService::class)->handle(new Illuminate\Database\Eloquent\Collection());
        expect(DB::getQueryLog())->toBeEmpty();
    } finally {
        DB::disableQueryLog();
    }
});
