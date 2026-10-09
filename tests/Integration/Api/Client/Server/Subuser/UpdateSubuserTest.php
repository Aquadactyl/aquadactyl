<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Subuser;
use Pterodactyl\Models\Permission;
use Illuminate\Support\Facades\Bus;
use Pterodactyl\Jobs\RevokeSftpAccessJob;

test('correct permissions are required for updating', function () {
    Bus::fake([RevokeSftpAccessJob::class]);

    [$user, $server] = $this->generateTestAccount(['user.read']);

    $subuser = Subuser::factory()
        ->for(User::factory()->create())
        ->for($server)
        ->create([
            'permissions' => ['control.start'],
        ]);

    $this->postJson(
        $endpoint = "/api/client/servers/$server->uuid/users/{$subuser->user->uuid}",
        $data = [
            'permissions' => [
                'control.start',
                'control.stop',
            ],
        ]
    )
        ->assertUnauthorized();

    $this->actingAs($subuser->user)->postJson($endpoint, $data)->assertForbidden();
    $this->actingAs($user)->postJson($endpoint, $data)->assertForbidden();

    $server->subusers()->where('user_id', $user->id)->update([
        'permissions' => [
            Permission::ACTION_USER_UPDATE,
            Permission::ACTION_CONTROL_START,
            Permission::ACTION_CONTROL_STOP,
        ],
    ]);

    $this->postJson($endpoint, $data)->assertOk();

    Bus::assertDispatchedTimes(function (RevokeSftpAccessJob $job) use ($server, $subuser) {
        return $job->user === $subuser->user->uuid && $job->target->is($server);
    });
});

test('permissions are saved to account', function () {
    Bus::fake([RevokeSftpAccessJob::class]);

    [$user, $server] = $this->generateTestAccount();

    /** @var Subuser $subuser */
    $subuser = Subuser::factory()
        ->for(User::factory()->create())
        ->for($server)
        ->create([
            'permissions' => ['control.restart', 'websocket.connect', 'foo.bar'],
        ]);

    $this->actingAs($user)
        ->postJson("/api/client/servers/$server->uuid/users/{$subuser->user->uuid}", [
            'permissions' => [
                'control.start',
                'control.stop',
                'control.stop',
                'foo.bar',
                'power.fake',
            ],
        ])
        ->assertOk();

    $subuser->refresh();
    $this->assertEqualsCanonicalizing(
        ['control.start', 'control.stop', 'websocket.connect'],
        $subuser->permissions
    );

    Bus::assertDispatchedTimes(function (RevokeSftpAccessJob $job) use ($server, $subuser) {
        return $job->user === $subuser->user->uuid && $job->target->is($server);
    });
});

test('user cannot assign permissions they do not have', function () {
    Bus::fake([RevokeSftpAccessJob::class]);

    [$user, $server] = $this->generateTestAccount([Permission::ACTION_USER_READ, Permission::ACTION_USER_UPDATE]);

    $subuser = Subuser::factory()
        ->for(User::factory()->create())
        ->for($server)
        ->create(['permissions' => ['foo.bar']]);

    $this->actingAs($user)
        ->postJson("/api/client/servers/$server->uuid/users/{$subuser->user->uuid}", [
            'permissions' => [Permission::ACTION_USER_READ, Permission::ACTION_CONTROL_CONSOLE],
        ])
        ->assertForbidden();

    $this->assertEqualsCanonicalizing(['foo.bar'], $subuser->refresh()->permissions);

    Bus::assertNothingDispatched();
});

test('user cannot update self', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_USER_READ, Permission::ACTION_USER_UPDATE]);

    $this->actingAs($user)
        ->postJson("/api/client/servers/$server->uuid/users/$user->uuid", [])
        ->assertForbidden();
});

test('cannot update subuser for different server', function () {
    [$user, $server] = $this->generateTestAccount();
    [$user2] = $this->generateTestAccount(['foo.bar']);

    $this->actingAs($user)
        ->postJson("/api/client/servers/$server->uuid/users/$user2->uuid", [])
        ->assertNotFound();
});
