<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Subuser;
use Illuminate\Support\Facades\Bus;
use Pterodactyl\Jobs\RevokeSftpAccessJob;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Services\Users\UserDeletionService;

beforeEach(function () {
    Bus::fake([RevokeSftpAccessJob::class]);
});

test('exception returned if user assigned to servers', function () {
    $server = $this->createServerModel();

    expect(fn () => app(UserDeletionService::class)->handle($server->user))
        ->toThrow(DisplayException::class, __('admin/user.exceptions.user_has_servers'));

    $this->assertModelExists($server->user);
    Bus::assertNotDispatched(RevokeSftpAccessJob::class);
});

test('user is deleted', function () {
    $user = User::factory()->create();

    app(UserDeletionService::class)->handle($user);

    $this->assertModelMissing($user);
    Bus::assertNotDispatched(RevokeSftpAccessJob::class);
});

test('user is deleted and access revoked', function () {
    $user = User::factory()->create();

    $server1 = $this->createServerModel();
    $server2 = $this->createServerModel(['node_id' => $server1->node_id]);

    Subuser::factory()->for($server1)->for($user)->create();
    Subuser::factory()->for($server2)->for($user)->create();

    app(UserDeletionService::class)->handle($user);

    $this->assertModelMissing($user);

    Bus::assertDispatchedTimes(RevokeSftpAccessJob::class);
    Bus::assertDispatched(fn (RevokeSftpAccessJob $job) => $job->user === $user->uuid && $job->target->is($server1->node));
});
