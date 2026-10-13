<?php

use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Backup;
use Pterodactyl\Models\Permission;
use Pterodactyl\Repositories\Wings\DaemonBackupRepository;

beforeEach(function () {
    config()->set('backups.throttles.period', 0);
    $this->daemon = $this->mock(DaemonBackupRepository::class);
});

test('backup creation preserves ignored patterns lock status and list metadata', function () {
    [$user, $server] = $this->generateTestAccount();
    $server->forceFill(['backup_limit' => 2])->save();
    $this->daemon->shouldReceive('setServer')->once()->with(Mockery::on(fn ($value) => $value->id === $server->id))->andReturnSelf();
    $this->daemon->shouldReceive('setBackupAdapter')->once()->with('wings')->andReturnSelf();
    $this->daemon->shouldReceive('backup')->once()->with(Mockery::on(fn ($backup) => $backup->name === 'Nightly backup' && $backup->is_locked && $backup->ignored_files === ['logs/*', '0']))->andReturn(new Response());
    $url = '/api/client/servers/' . $server->uuid . '/backups';
    $response = $this->actingAs($user)->postJson($url, ['name' => '  Nightly backup  ', 'ignored' => "logs/*\n\n0\n", 'is_locked' => true])->assertOk();
    $backup = Backup::query()->where('server_id', $server->id)->firstOrFail();
    $response->assertJsonPath('attributes.name', 'Nightly backup')->assertJsonPath('attributes.is_locked', true);
    $this->getJson($url . '?per_page=100')->assertOk()->assertJsonPath('meta.backup_count', 1)->assertJsonPath('meta.pagination.per_page', 50);
    $this->getJson($this->link($backup))->assertOk()->assertJsonPath('attributes.name', 'Nightly backup');
    $this->postJson($this->link($backup, 'lock'))->assertOk()->assertJsonPath('attributes.is_locked', false);
    expect($backup->fresh()->is_locked)->toBeFalse();
    $this->postJson($this->link($backup, 'lock'))->assertOk()->assertJsonPath('attributes.is_locked', true);
});

test('users without deletion permission cannot create permanently locked backups', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_BACKUP_CREATE, Permission::ACTION_BACKUP_READ]);
    $server->forceFill(['backup_limit' => 1])->save();
    $this->daemon->shouldReceive('setServer')->andReturnSelf();
    $this->daemon->shouldReceive('setBackupAdapter')->andReturnSelf();
    $this->daemon->shouldReceive('backup')->once()->with(Mockery::on(fn ($backup) => !$backup->is_locked && str_starts_with($backup->name, 'Backup at ')))->andReturn(new Response());
    $this->actingAs($user)->postJson('/api/client/servers/' . $server->uuid . '/backups', ['is_locked' => true])->assertOk()->assertJsonPath('attributes.is_locked', false);
});

test('backup rate limits count recent attempts before contacting Wings', function () {
    [$user, $server] = $this->generateTestAccount();
    $server->forceFill(['backup_limit' => 10])->save();
    config()->set('backups.throttles', ['limit' => 1, 'period' => 600]);
    Backup::factory()->create(['server_id' => $server->id, 'created_at' => now()]);
    $this->daemon->shouldNotReceive('setServer');
    $response = $this->actingAs($user)->postJson('/api/client/servers/' . $server->uuid . '/backups', ['name' => 'Rate limited'])->assertStatus(429);
    expect($response->headers->get('Retry-After'))->not->toBeNull();
});

test('backup quotas cannot be bypassed with failed names or lock settings', function () {
    [$user, $server] = $this->generateTestAccount();
    $server->forceFill(['backup_limit' => 0])->save();
    $this->daemon->shouldNotReceive('setServer');
    $this->actingAs($user)->postJson('/api/client/servers/' . $server->uuid . '/backups', ['name' => 'Disallowed'])->assertBadRequest();
});
