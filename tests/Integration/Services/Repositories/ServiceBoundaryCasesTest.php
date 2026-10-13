<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Backup;
use Illuminate\Support\Facades\Bus;
use Pterodactyl\Services\Nests\NestUpdateService;
use Pterodactyl\Services\Nests\NestDeletionService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Servers\BuildModificationService;
use Pterodactyl\Services\Servers\DetailsModificationService;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

uses(DatabaseTransactions::class);

test('server details ownership changes queue access revocation for the old owner', function () {
    $server = $this->createServerModel();
    $old = $server->user;
    $new = User::factory()->create();
    Bus::fake();
    $updated = app(DetailsModificationService::class)->handle($server, ['owner_id' => $new->id, 'name' => $server->name]);
    expect($updated->owner_id)->toBe($new->id);
    Bus::assertDispatched(Pterodactyl\Jobs\RevokeSftpAccessJob::class);
});

test('changing a primary allocation to another servers allocation is rejected without modifying either server', function () {
    $server = $this->createServerModel();
    $other = $this->createServerModel();
    expect(fn () => app(BuildModificationService::class)->handle($server, ['allocation_id' => $other->allocation_id]))->toThrow(Pterodactyl\Exceptions\DisplayException::class, 'not currently assigned');
    expect($server->fresh()->allocation_id)->toBe($server->allocation_id);
});

test('nests with active servers cannot be deleted and their authors remain immutable on updates', function () {
    $server = $this->createServerModel();
    $nest = $server->nest;
    expect(fn () => app(NestDeletionService::class)->handle($nest->id))->toThrow(Pterodactyl\Exceptions\Service\HasActiveServersException::class);
    app(NestUpdateService::class)->handle($nest->id, ['author' => 'changed@example.test', 'name' => 'Updated nest']);
    expect($nest->fresh()->author)->toBe($nest->author)->and($nest->fresh()->name)->toBe('Updated nest');
});

test('settings cache misses keep lazy defaults and previously uncached persisted settings can be read', function () {
    $repository = app(SettingsRepositoryInterface::class);
    $key = 'coverage::lazy::' . fake()->uuid();
    expect($repository->get($key, fn () => 'first'))->toBe('first')->and($repository->get($key, fn () => 'second'))->toBe('second');
    $persisted = $key . ':persisted';
    Pterodactyl\Models\Setting::forceCreate(['key' => $persisted, 'value' => 'database value']);
    expect($repository->get($persisted))->toBe('database value');
    $repository->forget($persisted);
});

test('backup rotation replaces only the oldest unlocked backup and refuses an entirely locked set', function (bool $locked) {
    $server = $this->createServerModel(['backup_limit' => 1]);
    config()->set('backups.throttles.period', 0);
    $oldest = Backup::factory()->create(['server_id' => $server->id, 'is_locked' => $locked, 'is_successful' => true, 'completed_at' => now(), 'created_at' => now()->subDay()]);
    $service = app(Pterodactyl\Services\Backups\InitiateBackupService::class);
    if ($locked) {
        expect(fn () => $service->handle($server, 'Replacement', true))->toThrow(Pterodactyl\Exceptions\Service\Backup\TooManyBackupsException::class);
        $this->assertDatabaseHas('backups', ['id' => $oldest->id]);
    } else {
        $delete = $this->mock(Pterodactyl\Services\Backups\DeleteBackupService::class);
        $delete->expects('handle')->with(Mockery::on(fn ($backup) => $backup->id === $oldest->id))->andReturnUsing(fn ($backup) => $backup->delete());
        $daemon = $this->mock(Pterodactyl\Repositories\Wings\DaemonBackupRepository::class);
        $daemon->allows('setServer')->andReturnSelf();
        $daemon->allows('setBackupAdapter')->andReturnSelf();
        $daemon->expects('backup');
        $backup = app(Pterodactyl\Services\Backups\InitiateBackupService::class)->handle($server, 'Replacement', true);
        expect($backup->name)->toBe('Replacement');
        $this->assertSoftDeleted($oldest);
    }
})->with([true, false]);

test('invalid two-factor codes do not enable authentication or generate recovery tokens', function () {
    $user = User::factory()->create(['use_totp' => false, 'totp_secret' => encrypt(str_repeat('A', 16))]);
    $this->mock(PragmaRX\Google2FA\Google2FA::class)->expects('verifyKey')->andReturn(false);
    expect(fn () => app(Pterodactyl\Services\Users\ToggleTwoFactorService::class)->handle($user, '000000'))->toThrow(Pterodactyl\Exceptions\Service\User\TwoFactorAuthenticationTokenInvalid::class);
    expect($user->refresh()->use_totp)->toBeFalse()->and($user->recoveryTokens()->count())->toBe(0);
});
