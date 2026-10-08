<?php

namespace Pterodactyl\Tests\Integration\Api\Client;

use Pterodactyl\Models\User;
use Pterodactyl\Models\ApiKey;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Permission;
use Pterodactyl\Models\ActivityLog;

class ActivityLogControllerTest extends ClientApiIntegrationTestCase
{
    protected function tearDown(): void
    {
        ActivityLog::query()->delete();
        ApiKey::query()->delete();
        parent::tearDown();
    }

    private function record(User|Server $subject, string $event, ?User $actor, array $attributes = []): ActivityLog
    {
        $log = new ActivityLog();
        $log->forceFill(array_merge([
            'event' => $event,
            'ip' => '192.0.2.10',
            'actor_type' => $actor?->getMorphClass(),
            'actor_id' => $actor?->id,
            'properties' => [],
            'timestamp' => now(),
        ], $attributes))->save();
        $subject->activity()->attach($log->id);

        return $log;
    }

    public function testAccountEventChoicesCoverTheVisibleHistoryAndPicturesAreIncluded(): void
    {
        $user = User::factory()->create(['avatar' => 'avatars/test.png']);
        $other = User::factory()->create();
        $this->record($user, 'auth:success', $user, ['timestamp' => now()->subDay()]);
        $this->record($user, 'auth:success', $user, ['timestamp' => now()->subHours(2)]);
        $this->record($user, 'user:account.avatar-updated', $user);
        $this->record($user, 'server:file.upload', $user);
        $this->record($other, 'user:account.password-changed', $other);

        $response = $this->actingAs($user)->getJson('/api/client/account/activity?include=actor&per_page=1&filter[event_exact]=auth:success');
        $response->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.pagination.total', 2);
        $response->assertJsonPath('meta.available_events', ['auth:success', 'user:account.avatar-updated']);
        $response->assertJsonPath('data.0.attributes.relationships.actor.attributes.avatar_url', '/storage/avatars/test.png');
        $response->assertJsonPath('data.0.attributes.relationships.actor.attributes.image', '/storage/avatars/test.png');
    }

    public function testExactEventsAndLegacyCategoryFiltersWorkForBothEndpoints(): void
    {
        [$user, $server] = $this->generateTestAccount();
        foreach ([$user, $server] as $subject) {
            $this->record($subject, 'server:file.read', $user);
            $this->record($subject, 'server:file.read-extra', $user);
            $this->record($subject, 'server:file.write', $user);
            $this->record($subject, 'server:power.start', $user);
        }
        foreach (['/api/client/account/activity', $this->link($server, 'activity')] as $endpoint) {
            $this->actingAs($user)->getJson($endpoint . '?filter[event_exact]=server:file.read')
                ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.attributes.event', 'server:file.read');
            $this->getJson($endpoint . '?filter[event]=server:file.')
                ->assertOk()->assertJsonCount(3, 'data');
        }
    }

    public function testTimeSourceIPAndSortingFiltersWorkTogether(): void
    {
        [$user, $server] = $this->generateTestAccount();
        $key = ApiKey::factory()->create(['user_id' => $user->id]);
        foreach ([$user, $server] as $subject) {
            $this->record($subject, 'auth:success', $user, ['timestamp' => now()->subDays(100)]);
            $this->record($subject, 'user:account.email-changed', $user, ['timestamp' => now()->subHours(4)]);
            $this->record($subject, 'user:account.password-changed', $user, ['timestamp' => now()->subHours(2), 'ip' => '2001:db8::1']);
            $this->record($subject, 'server:file.read', $user, ['api_key_id' => $key->id]);
            $this->record($subject, 'server:sftp.read', $user);
            $this->record($subject, 'server:reinstall', null);
        }
        foreach (['/api/client/account/activity', $this->link($server, 'activity')] as $endpoint) {
            $this->actingAs($user)->getJson($endpoint . '?filter[period]=24h&filter[source]=web&sort=timestamp')
                ->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.0.attributes.event', 'user:account.email-changed');
            $this->getJson($endpoint . '?filter[period]=24h&filter[source]=web&sort=-timestamp')
                ->assertOk()->assertJsonPath('data.0.attributes.event', 'user:account.password-changed');
            $this->getJson($endpoint . '?filter[ip]=2001:db8::1')
                ->assertOk()->assertJsonCount(1, 'data');
            foreach (['api' => 'server:file.read', 'sftp' => 'server:sftp.read', 'system' => 'server:reinstall'] as $source => $event) {
                $this->getJson($endpoint . '?filter[source]=' . $source)
                    ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.attributes.event', $event);
            }
        }
    }

    public function testHiddenAdministratorEventsDoNotLeakIntoServerFilterChoices(): void
    {
        config()->set('activity.hide_admin_activity', true);
        [$owner, $server] = $this->generateTestAccount();
        $admin = User::factory()->create(['root_admin' => true]);
        $otherServer = $this->createServerModel();
        $this->record($server, 'server:file.read', $owner);
        $this->record($server, 'server:file.read', $owner);
        $this->record($server, 'server:power.kill', $admin);
        $this->record($server, 'server:file.upload', $owner);
        $this->record($otherServer, 'server:reinstall', $otherServer->user);

        $this->actingAs($owner)->getJson($this->link($server, 'activity') . '?per_page=1')
            ->assertOk()->assertJsonPath('meta.pagination.total', 2)->assertJsonPath('meta.available_events', ['server:file.read']);
        $this->getJson($this->link($server, 'activity') . '?filter[event_exact]=server:power.kill')
            ->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.available_events', ['server:file.read']);
    }

    public function testIPFiltersCannotRevealAnotherActorsHiddenAddress(): void
    {
        [$owner, $server] = $this->generateTestAccount();
        $other = User::factory()->create();
        $this->record($server, 'server:file.read', $owner);
        $this->record($server, 'server:file.write', $other, ['ip' => '198.51.100.20']);
        $endpoint = $this->link($server, 'activity');
        $this->actingAs($owner)->getJson($endpoint)->assertOk()->assertJsonPath('data.0.attributes.ip', null);
        $this->getJson($endpoint . '?filter[ip]=198.51.100.20')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson($endpoint . '?filter[ip]=192.0.2.10')->assertOk()->assertJsonCount(1, 'data');
        $admin = User::factory()->create(['root_admin' => true]);
        $this->actingAs($admin)->getJson($endpoint . '?filter[ip]=198.51.100.20')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.attributes.ip', '198.51.100.20');
    }

    public function testEmptyResultsKeepChoicesAndPaginationIsStable(): void
    {
        $user = User::factory()->create();
        $first = $this->record($user, 'auth:success', $user);
        $second = $this->record($user, 'auth:success', $user);
        $endpoint = '/api/client/account/activity';
        $this->actingAs($user)->getJson($endpoint . '?per_page=1')
            ->assertOk()->assertJsonPath('data.0.attributes.id', sha1($second->id));
        $this->getJson($endpoint . '?per_page=1&page=2')
            ->assertOk()->assertJsonPath('data.0.attributes.id', sha1($first->id));
        $this->getJson($endpoint . '?filter[source]=api')->assertOk()->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.available_events', ['auth:success']);
    }

    public function testInvalidFiltersAreRejectedForBothEndpoints(): void
    {
        [$user, $server] = $this->generateTestAccount();
        foreach (['/api/client/account/activity', $this->link($server, 'activity')] as $endpoint) {
            foreach (['filter[period]=yesterday', 'filter[source]=other', 'filter[ip]=not-an-ip', 'per_page=0', 'per_page=101', 'page=0'] as $query) {
                $this->actingAs($user)->getJson($endpoint . '?' . $query)->assertUnprocessable();
            }
        }
    }

    public function testActivityReadPermissionStillControlsServerAccess(): void
    {
        [$user, $server] = $this->generateTestAccount([Permission::ACTION_ACTIVITY_READ]);
        $this->record($server, 'server:file.read', $server->user);
        $this->actingAs($user)->getJson($this->link($server, 'activity'))->assertOk()->assertJsonCount(1, 'data');
        [$denied, $otherServer] = $this->generateTestAccount([Permission::ACTION_WEBSOCKET_CONNECT]);
        $this->actingAs($denied)->getJson($this->link($otherServer, 'activity'))->assertForbidden();
    }
}
