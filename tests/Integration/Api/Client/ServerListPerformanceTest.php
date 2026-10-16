<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Subuser;
use Illuminate\Support\Facades\DB;
use Pterodactyl\Models\Permission;
use Pterodactyl\Models\EggVariable;
use Pterodactyl\Models\ServerVariable;

test('list variables retain distinct overrides and defaults for servers sharing an egg', function () {
    $user = User::factory()->create();
    $first = $this->createServerModel(['owner_id' => $user->id, 'startup' => '{{BENCH_VALUE}} {{BENCH_SECRET}}']);
    $egg = $this->cloneEggAndVariables($first->egg);
    $first->update(['egg_id' => $egg->id]);
    $second = $this->createServerModel(['owner_id' => $user->id, 'egg_id' => $first->egg_id, 'startup' => '{{BENCH_VALUE}} {{BENCH_SECRET}}']);
    $third = $this->createServerModel(['owner_id' => $user->id, 'egg_id' => $first->egg_id, 'startup' => '{{BENCH_VALUE}} {{BENCH_SECRET}}']);
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

test('list query count stays bounded as the page grows', function () {
    $user = User::factory()->create();
    for ($i = 0; $i < 12; ++$i) {
        $this->createServerModel(['owner_id' => $user->id]);
    }
    $this->actingAs($user)->getJson('/api/client?per_page=1')->assertOk();
    DB::enableQueryLog();
    DB::flushQueryLog();
    $this->getJson('/api/client?per_page=1')->assertOk();
    $small = count(DB::getQueryLog());
    DB::flushQueryLog();
    $this->getJson('/api/client?per_page=12')->assertOk()->assertJsonCount(12, 'data');
    $large = count(DB::getQueryLog());
    // Pagination must not first fetch all accessible server rows into PHP.
    $enumerations = collect(DB::getQueryLog())->filter(fn (array $query) => str_starts_with($query['query'], 'select `servers`.* from `servers` left join `subusers`')
    );
    DB::disableQueryLog();

    expect($large)->toBeLessThanOrEqual($small + 2);
    expect($enumerations)->toBeEmpty();
});
