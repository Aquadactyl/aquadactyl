<?php

namespace Pterodactyl\Tests\Integration\Api\Client\Server;

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
use Pterodactyl\Tests\Integration\Api\Client\ClientApiIntegrationTestCase;

class GameQueryControllerTest extends ClientApiIntegrationTestCase
{
    public function setUp(): void
    {
        parent::setUp();
        Bus::fake([QueryGameServerJob::class]);
        Cache::flush();
    }

    public function testKnownGamesAreDetectedAndNonGamesDoNotDispatchQueries(): void
    {
        [$user, $server] = $this->generateTestAccount();
        $settings = app(GameQuerySettingsService::class);
        $server->setRelation('egg', $this->cloneEggAndVariables($server->egg));
        $server->forceFill(['egg_id' => $server->egg->id])->save();
        foreach (['Paper' => 'protocol-minecraftvanilla', 'Minecraft Bedrock' => 'protocol-minecraftbedrock', 'Rust' => 'rust', 'Counter-Strike 2' => 'counterstrike2', 'Garry\'s Mod' => 'garrysmod'] as $name => $game) {
            $server->egg->name = $name;
            $this->assertSame($game, $settings->game($server));
        }
        $server->egg->forceFill(['name' => 'Generic PHP Application'])->save();
        $this->actingAs($user)->getJson($this->link($server, 'query'))->assertOk()
            ->assertJsonPath('attributes.status', 'unsupported')->assertJsonPath('attributes.players', null);
        Bus::assertNotDispatched(QueryGameServerJob::class);
    }

    public function testFirstQueryReturnsPendingAndOnlySchedulesOneBackgroundJob(): void
    {
        [$user, $server] = $this->generateTestAccount();
        $endpoint = $this->link($server, 'query');
        $this->actingAs($user)->getJson($endpoint)->assertOk()->assertJsonPath('attributes.status', 'pending');
        $this->getJson($endpoint)->assertOk()->assertJsonPath('attributes.status', 'pending');
        Bus::assertDispatchedTimes(QueryGameServerJob::class, 1);
    }

    public function testCompletedQueriesAreCachedAndZeroPlayersArePreserved(): void
    {
        [$user, $server] = $this->generateTestAccount();
        $settings = app(GameQuerySettingsService::class);
        $key = $settings->key($server, $settings->target($server));
        $runner = \Mockery::mock(GameQueryRunner::class);
        $runner->shouldReceive('query')->once()->andReturn(['status' => 'available', 'players' => 0, 'max_players' => 20]);
        Cache::put($key . ':pending', true, 20);
        (new QueryGameServerJob($server->id, $key))->handle($settings, $runner);
        $this->assertFalse(Cache::has($key . ':pending'));
        $this->actingAs($user)->getJson($this->link($server, 'query'))
            ->assertOk()->assertJsonPath('attributes.status', 'available')
            ->assertJsonPath('attributes.players', 0)->assertJsonPath('attributes.max_players', 20);
        Bus::assertNotDispatched(QueryGameServerJob::class);
        $this->travel(31)->seconds();
        $this->getJson($this->link($server, 'query'))->assertOk()->assertJsonPath('attributes.players', 0);
        Bus::assertDispatchedTimes(QueryGameServerJob::class, 1);
    }

    public function testQueryFailuresDoNotBecomeZeroPlayersAndAreCached(): void
    {
        [$user, $server] = $this->generateTestAccount();
        $settings = app(GameQuerySettingsService::class);
        $key = $settings->key($server, $settings->target($server));
        $runner = \Mockery::mock(GameQueryRunner::class);
        $runner->shouldReceive('query')->once()->andReturn(['status' => 'unavailable', 'players' => null, 'max_players' => null]);
        (new QueryGameServerJob($server->id, $key))->handle($settings, $runner);
        $this->actingAs($user)->getJson($this->link($server, 'query'))->assertOk()
            ->assertJsonPath('attributes.status', 'unavailable')->assertJsonPath('attributes.players', null);
        Bus::assertNotDispatched(QueryGameServerJob::class);
    }

    public function testClientsCannotChooseArbitraryQueryAddressesOrSeeAnotherUsersServers(): void
    {
        [$user, $server] = $this->generateTestAccount();
        $settings = app(GameQuerySettingsService::class);
        $key = $settings->key($server, $settings->target($server));
        $this->actingAs($user)->getJson($this->link($server, 'query') . '?host=169.254.169.254&port=80')
            ->assertOk();
        Bus::assertDispatched(QueryGameServerJob::class, fn ($job) => $job->key === $key);
        $other = User::factory()->create();
        $this->actingAs($other)->getJson($this->link($server, 'query'))->assertNotFound();
    }

    public function testDisabledAndChangedConfigurationsDoNotRunAnOldJob(): void
    {
        [$user, $server] = $this->generateTestAccount();
        $settings = app(GameQuerySettingsService::class);
        $key = $settings->key($server, $settings->target($server));
        $server->forceFill(['game_query_type' => 'none'])->save();
        $runner = \Mockery::mock(GameQueryRunner::class);
        $runner->shouldNotReceive('query');
        (new QueryGameServerJob($server->id, $key))->handle($settings, $runner);
        $this->actingAs($user)->getJson($this->link($server, 'query'))->assertOk()->assertJsonPath('attributes.status', 'unsupported');
        $this->assertFalse(Cache::has($key));
        Bus::assertNotDispatched(QueryGameServerJob::class);
    }

    public function testServerListIncludesCountryGameAndOnlyTheViewersPermissions(): void
    {
        [$user, $server] = $this->generateTestAccount([Permission::ACTION_CONTROL_START]);
        $server->node->country_code = 'uk';
        $server->node->save();
        $this->actingAs($user)->getJson('/api/client')->assertOk()
            ->assertJsonPath('data.0.attributes.node_country', 'GB')
            ->assertJsonPath('data.0.attributes.node_country_name', 'United Kingdom')
            ->assertJsonPath('data.0.attributes.game_query_type', 'protocol-minecraftvanilla')
            ->assertJsonPath('data.0.attributes.user_permissions', [Permission::ACTION_CONTROL_START]);
    }

    public function testCountryCodesAreOptionalValidatedAndNormalized(): void
    {
        $rules = ['country_code' => Node::getRules()['country_code']];
        foreach (['GB', 'gb', 'UK', 'US', null] as $code) {
            $this->assertTrue(Validator::make(['country_code' => $code], $rules)->passes());
        }
        foreach (['XX', '../GB', 'England'] as $code) {
            $this->assertFalse(Validator::make(['country_code' => $code], $rules)->passes());
        }
    }

    public function testOnlyAdminsCanChangeQuerySettingsAndAllocationsMustBelongToTheServer(): void
    {
        [$user, $server] = $this->generateTestAccount();
        $path = '/admin/servers/view/' . $server->id . '/game-query';
        $this->actingAs($user)->patchJson($path, ['game_query_type' => 'rust'])->assertForbidden();
        $admin = User::factory()->create(['root_admin' => true]);
        $other = Allocation::factory()->create(['node_id' => $server->node_id]);
        $this->actingAs($admin)->patchJson($path, ['game_query_type' => 'rust', 'game_query_allocation_id' => $other->id])->assertUnprocessable();
        $this->patchJson($path, ['game_query_type' => 'fake-game'])->assertUnprocessable();
        $this->patchJson($path, ['game_query_type' => 'rust', 'game_query_allocation_id' => $server->allocation_id])->assertRedirect();
        $this->assertSame('rust', $server->refresh()->game_query_type);
        $this->assertSame($server->allocation_id, $server->game_query_allocation_id);
        $target = app(GameQuerySettingsService::class)->target($server);
        $this->assertTrue($target['givenPortOnly']);
    }

    public function testSuccessfulPowerActionsInvalidateResourcesAndPlayerCounts(): void
    {
        [$user, $server] = $this->generateTestAccount([Permission::ACTION_CONTROL_START]);
        $settings = app(GameQuerySettingsService::class);
        $key = $settings->key($server, $settings->target($server));
        Cache::put($key, ['status' => 'available', 'players' => 7], 120);
        Cache::put('resources:' . $server->uuid, ['current_state' => 'offline'], 20);
        $repository = \Mockery::mock(DaemonPowerRepository::class);
        $repository->shouldReceive('setServer')->once()->andReturnSelf();
        $repository->shouldReceive('send')->with('start')->once();
        $this->app->instance(DaemonPowerRepository::class, $repository);
        $this->actingAs($user)->postJson($this->link($server, 'power'), ['signal' => 'start'])->assertNoContent();
        $this->assertFalse(Cache::has($key));
        $this->assertFalse(Cache::has('resources:' . $server->uuid));
    }
}
