<?php

use Illuminate\Http\Response;
use Pterodactyl\Models\Backup;
use Pterodactyl\Models\Permission;
use Illuminate\Support\Facades\Event;
use Pterodactyl\Events\ActivityLogged;
use Pterodactyl\Repositories\Wings\DaemonBackupRepository;

beforeEach(function () {
    $this->repository = $this->mock(DaemonBackupRepository::class);
});

test('user without permission cannot delete backup', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_BACKUP_CREATE]);

    $backup = Backup::factory()->create(['server_id' => $server->id]);

    $this->actingAs($user)->deleteJson($this->link($backup))
        ->assertStatus(Response::HTTP_FORBIDDEN);
});

test('backup can be deleted', function () {
    Event::fake([ActivityLogged::class]);

    [$user, $server] = $this->generateTestAccount([Permission::ACTION_BACKUP_DELETE]);

    /** @var Backup $backup */
    $backup = Backup::factory()->create(['server_id' => $server->id]);

    $this->repository->expects('setServer->delete')->with(
        Mockery::on(function ($value) use ($backup) {
            return $value instanceof Backup && $value->uuid === $backup->uuid;
        })
    )->andReturn(new Response());

    $this->actingAs($user)->deleteJson($this->link($backup))->assertStatus(Response::HTTP_NO_CONTENT);

    $backup->refresh();
    $this->assertSoftDeleted($backup);

    $this->assertActivityFor('server:backup.delete', $user, [$backup, $backup->server]);

    $this->actingAs($user)->deleteJson($this->link($backup))->assertStatus(Response::HTTP_NOT_FOUND);
});
