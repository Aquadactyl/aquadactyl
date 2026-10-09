<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Models\Permission;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Jobs\QueryGameServerJob;
use Illuminate\Support\Facades\Validator;
use Pterodactyl\Repositories\Wings\DaemonPowerRepository;
use Pterodactyl\Services\Servers\GameQuery\GameQueryRunner;
use Pterodactyl\Services\Servers\GameQuery\GameQuerySettingsService;

beforeEach(function () {
    Bus::fake([QueryGameServerJob::class]);
    Cache::flush();
});

test('known games are detected and non games do not dispatch queries', function () {
    [$user, $server] = $this->generateTestAccount();
    $settings = app(GameQuerySettingsService::class);
    $server->setRelation('egg', $this->cloneEggAndVariables($server->egg));
    $server->forceFill(['egg_id' => $server->egg->id])->save();
    foreach (['Paper' => 'protocol-minecraftvanilla', 'Minecraft Bedrock' => 'protocol-minecraftbedrock', 'Rust' => 'rust', 'Counter-Strike 2' => 'counterstrike2', 'Garry\'s Mod' => 'garrysmod'] as $name => $game) {
        $server->egg->name = $name;
        expect($settings->game($server))->toBe($game);
    }
    $server->egg->forceFill(['name' => 'Generic PHP Application'])->save();
    $this->actingAs($user)->getJson($this->link($server, 'query'))->assertOk()
        ->assertJsonPath('attributes.status', 'unsupported')->assertJsonPath('attributes.players', null);
    Bus::assertNotDispatched(QueryGameServerJob::class);
});

test('first query returns pending and only schedules one background job', function () {
    [$user, $server] = $this->generateTestAccount();
    $endpoint = $this->link($server, 'query');
    $this->actingAs($user)->getJson($endpoint)->assertOk()->assertJsonPath('attributes.status', 'pending');
    $this->getJson($endpoint)->assertOk()->assertJsonPath('attributes.status', 'pending');
    Bus::assertDispatchedTimes(QueryGameServerJob::class, 1);
});

test('site wide player count setting stops new queries and queued jobs', function () {
    [$user, $server] = $this->generateTestAccount();
    $settings = app(GameQuerySettingsService::class);
    $key = $settings->key($server, $settings->target($server));
    config()->set('aquadactyl.features.player_counts', false);
    $runner = Mockery::mock(GameQueryRunner::class);
    $runner->shouldNotReceive('query');
    (new QueryGameServerJob($server->id, $key))->handle($settings, $runner);
    $this->actingAs($user)->getJson($this->link($server, 'query'))->assertOk()
        ->assertJsonPath('attributes.status', 'unsupported')->assertJsonPath('attributes.players', null);
    $this->getJson('/api/client')->assertOk()->assertJsonPath('data.0.attributes.game_query_type', null);
    Bus::assertNotDispatched(QueryGameServerJob::class);
});

test('completed queries are cached and zero players are preserved', function () {
    [$user, $server] = $this->generateTestAccount();
    $settings = app(GameQuerySettingsService::class);
    $key = $settings->key($server, $settings->target($server));
    $runner = Mockery::mock(GameQueryRunner::class);
    $runner->shouldReceive('query')->once()->andReturn(['status' => 'available', 'players' => 0, 'max_players' => 20]);
    Cache::put($key . ':pending', true, 20);
    (new QueryGameServerJob($server->id, $key))->handle($settings, $runner);
    expect(Cache::has($key . ':pending'))->toBeFalse();
    $this->actingAs($user)->getJson($this->link($server, 'query'))
        ->assertOk()->assertJsonPath('attributes.status', 'available')
        ->assertJsonPath('attributes.players', 0)->assertJsonPath('attributes.max_players', 20);
    Bus::assertNotDispatched(QueryGameServerJob::class);
    $this->travel(31)->seconds();
    $this->getJson($this->link($server, 'query'))->assertOk()->assertJsonPath('attributes.players', 0);
    Bus::assertDispatchedTimes(QueryGameServerJob::class, 1);
});

test('query failures do not become zero players and are cached', function () {
    [$user, $server] = $this->generateTestAccount();
    $settings = app(GameQuerySettingsService::class);
    $key = $settings->key($server, $settings->target($server));
    $runner = Mockery::mock(GameQueryRunner::class);
    $runner->shouldReceive('query')->once()->andReturn(['status' => 'unavailable', 'players' => null, 'max_players' => null]);
    (new QueryGameServerJob($server->id, $key))->handle($settings, $runner);
    $this->actingAs($user)->getJson($this->link($server, 'query'))->assertOk()
        ->assertJsonPath('attributes.status', 'unavailable')->assertJsonPath('attributes.players', null);
    Bus::assertNotDispatched(QueryGameServerJob::class);
});

test('clients cannot choose arbitrary query addresses or see another users servers', function () {
    [$user, $server] = $this->generateTestAccount();
    $settings = app(GameQuerySettingsService::class);
    $key = $settings->key($server, $settings->target($server));
    $this->actingAs($user)->getJson($this->link($server, 'query') . '?host=169.254.169.254&port=80')
        ->assertOk();
    Bus::assertDispatched(QueryGameServerJob::class, fn ($job) => $job->key === $key);
    $other = User::factory()->create();
    $this->actingAs($other)->getJson($this->link($server, 'query'))->assertNotFound();
});

test('disabled and changed configurations do not run an old job', function () {
    [$user, $server] = $this->generateTestAccount();
    $settings = app(GameQuerySettingsService::class);
    $key = $settings->key($server, $settings->target($server));
    $server->forceFill(['game_query_type' => 'none'])->save();
    $runner = Mockery::mock(GameQueryRunner::class);
    $runner->shouldNotReceive('query');
    (new QueryGameServerJob($server->id, $key))->handle($settings, $runner);
    $this->actingAs($user)->getJson($this->link($server, 'query'))->assertOk()->assertJsonPath('attributes.status', 'unsupported');
    expect(Cache::has($key))->toBeFalse();
    Bus::assertNotDispatched(QueryGameServerJob::class);
});

test('server list includes country game and only the viewers permissions', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_CONTROL_START]);
    $server->node->country_code = 'uk';
    $server->node->save();
    $this->actingAs($user)->getJson('/api/client')->assertOk()
        ->assertJsonPath('data.0.attributes.node_country', 'GB')
        ->assertJsonPath('data.0.attributes.node_country_name', 'United Kingdom')
        ->assertJsonPath('data.0.attributes.game_query_type', 'protocol-minecraftvanilla')
        ->assertJsonPath('data.0.attributes.user_permissions', [Permission::ACTION_CONTROL_START]);
});

test('country codes are optional validated and normalized', function () {
    $rules = ['country_code' => Node::getRules()['country_code']];
    foreach (['GB', 'gb', 'UK', 'US', null] as $code) {
        expect(Validator::make(['country_code' => $code], $rules)->passes())->toBeTrue();
    }
    foreach (['XX', '../GB', 'England'] as $code) {
        expect(Validator::make(['country_code' => $code], $rules)->passes())->toBeFalse();
    }
});

test('only admins can change query settings and allocations must belong to the server', function () {
    [$user, $server] = $this->generateTestAccount();
    $path = '/admin/servers/view/' . $server->id . '/game-query';
    $this->actingAs($user)->patchJson($path, ['game_query_type' => 'rust'])->assertForbidden();
    $admin = User::factory()->create(['root_admin' => true]);
    $other = Allocation::factory()->create(['node_id' => $server->node_id]);
    $this->actingAs($admin)->patchJson($path, ['game_query_type' => 'rust', 'game_query_allocation_id' => $other->id])->assertUnprocessable();
    $this->patchJson($path, ['game_query_type' => 'fake-game'])->assertUnprocessable();
    $this->patchJson($path, ['game_query_type' => 'rust', 'game_query_allocation_id' => $server->allocation_id])->assertRedirect();
    expect($server->refresh()->game_query_type)->toBe('rust')
        ->and($server->game_query_allocation_id)->toBe($server->allocation_id);
    $target = app(GameQuerySettingsService::class)->target($server);
    expect($target['givenPortOnly'])->toBeTrue();
});

test('successful power actions invalidate resources and player counts', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_CONTROL_START]);
    $settings = app(GameQuerySettingsService::class);
    $key = $settings->key($server, $settings->target($server));
    Cache::put($key, ['status' => 'available', 'players' => 7], 120);
    Cache::put('resources:' . $server->uuid, ['current_state' => 'offline'], 20);
    $repository = Mockery::mock(DaemonPowerRepository::class);
    $repository->shouldReceive('setServer')->once()->andReturnSelf();
    $repository->shouldReceive('send')->with('start')->once();
    $this->app->instance(DaemonPowerRepository::class, $repository);
    $this->actingAs($user)->postJson($this->link($server, 'power'), ['signal' => 'start'])->assertNoContent();
    expect(Cache::has($key))->toBeFalse()
        ->and(Cache::has('resources:' . $server->uuid))->toBeFalse();
});
