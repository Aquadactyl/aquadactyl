<?php

use Carbon\CarbonImmutable;
use Illuminate\Http\Response;
use Pterodactyl\Models\Backup;
use Pterodactyl\Models\Permission;
use GuzzleHttp\Psr7\Response as GuzzleResponse;
use Pterodactyl\Repositories\Wings\DaemonBackupRepository;

beforeEach(function () {
    $this->repository = $this->mock(DaemonBackupRepository::class);
});

test('backup can be restored', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_BACKUP_RESTORE]);

    /** @var Backup $backup */
    $backup = Backup::factory()->create(['server_id' => $server->id]);

    $this->repository->expects('setServer->restore')->with(
        Mockery::on(function ($value) use ($backup) {
            return $value instanceof Backup && $value->uuid === $backup->uuid;
        }),
        null,
        true,
    )->andReturn(new GuzzleResponse());

    $this->actingAs($user)->postJson($this->link($backup, 'restore'), ['truncate' => true])
        ->assertStatus(Response::HTTP_NO_CONTENT);
});

test('S3 restores provide Wings a signed download URL and mark the server as restoring', function () {
    [$user, $server] = $this->generateTestAccount();
    $backup = Backup::factory()->create(['server_id' => $server->id, 'disk' => Backup::ADAPTER_AWS_S3]);
    $url = 'https://s3.example.test/signed-backup';
    $this->mock(Pterodactyl\Services\Backups\DownloadLinkService::class)->expects('handle')->with(Mockery::on(fn ($model) => $model->id === $backup->id), Mockery::on(fn ($account) => $account->id === $user->id))->andReturn($url);
    $this->repository->expects('setServer->restore')->with(Mockery::on(fn ($model) => $model->id === $backup->id), $url, false)->andReturn(new GuzzleResponse());
    $this->actingAs($user)->postJson($this->link($backup, 'restore'), ['truncate' => false])->assertNoContent();
    expect($server->fresh()->status)->toBe(Pterodactyl\Models\Server::STATUS_RESTORING_BACKUP);
});

test('backup cannot be restored until successful and complete', function (bool $isSuccessful, bool $isCompleted) {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_BACKUP_RESTORE]);

    /** @var Backup $backup */
    $backup = Backup::factory()->create([
        'server_id' => $server->id,
        'is_successful' => $isSuccessful,
        'completed_at' => $isCompleted ? CarbonImmutable::now() : null,
    ]);

    $this->repository->shouldNotReceive('setServer');

    $this->actingAs($user)->postJson($this->link($backup, 'restore'), ['truncate' => true])
        ->assertStatus(Response::HTTP_BAD_REQUEST);
})->with([
    'failed completed' => [false, true],
    'failed incomplete' => [false, false],
    'successful incomplete' => [true, false],
]);
