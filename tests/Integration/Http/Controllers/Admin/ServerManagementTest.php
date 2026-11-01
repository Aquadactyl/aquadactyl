<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Mount;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Database;
use Pterodactyl\Models\Location;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Models\DatabaseHost;
use Pterodactyl\Models\ServerTransfer;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Helpers\SoftwareVersionService;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;
use Pterodactyl\Services\Databases\DatabasePasswordService;
use Pterodactyl\Repositories\Wings\DaemonTransferRepository;
use Pterodactyl\Services\Databases\DatabaseManagementService;
use Pterodactyl\Services\Servers\ServerConfigurationStructureService;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set('pterodactyl.auth.2fa_required', 0);
    app('cache')->forever(SoftwareVersionService::VERSION_CACHE_KEY, ['panel' => '1.0.0', 'wings' => '1.0.0']);
    $this->actingAs(User::factory()->create(['root_admin' => true]));
    $this->daemon = $this->mock(DaemonServerRepository::class);
    $this->daemon->shouldReceive('setServer')->andReturnSelf();
});

test('server database management scopes password resets and delegates provisioning and removal', function () {
    $server = $this->createServerModel();
    $host = DatabaseHost::factory()->create();
    $database = Database::factory()->create(['server_id' => $server->id, 'database_host_id' => $host->id]);
    $management = $this->mock(DatabaseManagementService::class);
    $management->shouldReceive('create')->once()->with(Mockery::on(fn ($model) => $model->id === $server->id), ['database' => 's' . $server->id . '_application', 'remote' => '%', 'database_host_id' => $host->id, 'max_connections' => 10])->andReturn($database);
    $this->post('/admin/servers/view/' . $server->id . '/database', ['database' => 'application', 'remote' => '%', 'database_host_id' => $host->id, 'max_connections' => 10])->assertRedirect();
    $this->mock(DatabasePasswordService::class)->shouldReceive('handle')->once()->with(Mockery::on(fn ($model) => $model->id === $database->id))->andReturn('new-password');
    $this->patch('/admin/servers/view/' . $server->id . '/database', ['database' => $database->id])->assertNoContent();
    $management->shouldReceive('delete')->once()->with(Mockery::on(fn ($model) => $model->id === $database->id));
    $this->delete('/admin/servers/view/' . $server->id . '/database/' . $database->id . '/delete')->assertNoContent();
});

test('server detail build and startup updates persist and retain existing ownership', function () {
    $server = $this->createServerModel();
    $base = '/admin/servers/view/' . $server->id;
    $this->patch($base . '/details', ['name' => 'Renamed server', 'owner_id' => $server->owner_id, 'description' => 'Updated description', 'external_id' => 'coverage-external'])->assertRedirect();
    expect($server->fresh()->name)->toBe('Renamed server')->and($server->fresh()->owner_id)->toBe($server->owner_id);
    $this->daemon->shouldReceive('sync')->once();
    $this->post($base . '/build', ['memory' => 2048, 'cpu' => 50, 'disk' => 4096])->assertRedirect();
    expect($server->fresh()->memory)->toBe(2048)->and($server->fresh()->cpu)->toBe(50);
    $this->post($base . '/startup', ['startup' => 'java -jar changed.jar', 'custom_docker_image' => 'ghcr.io/pterodactyl/yolks:java_21'])->assertRedirect();
    expect($server->fresh()->startup)->toBe('java -jar changed.jar')->and($server->fresh()->image)->toBe('ghcr.io/pterodactyl/yolks:java_21');
});

test('invalid build values return field validation errors', function () {
    $server = $this->createServerModel();
    $this->daemon->shouldNotReceive('sync');
    $this->postJson('/admin/servers/view/' . $server->id . '/build', ['memory' => -1])->assertUnprocessable();
});

test('installation status can be toggled both ways', function (?string $status) {
    $server = $this->createServerModel(['status' => $status]);
    $this->post('/admin/servers/view/' . $server->id . '/manage/toggle')->assertRedirect();
    expect($server->fresh()->status)->toBe($status === null ? Server::STATUS_INSTALLING : null);
})->with([null, Server::STATUS_INSTALLING]);

test('failed installations cannot be manually marked successful', function () {
    $server = $this->createServerModel(['status' => Server::STATUS_INSTALL_FAILED]);
    $this->postJson('/admin/servers/view/' . $server->id . '/manage/toggle')->assertBadRequest();
});

test('administrators can suspend unsuspend and reinstall an installed server', function () {
    $server = $this->createServerModel();
    $base = '/admin/servers/view/' . $server->id . '/manage';
    $this->daemon->shouldReceive('sync')->twice();
    $this->daemon->shouldReceive('reinstall')->once();
    $this->post($base . '/suspension', ['action' => 'suspend'])->assertRedirect();
    expect($server->fresh()->status)->toBe(Server::STATUS_SUSPENDED);
    $this->post($base . '/suspension', ['action' => 'unsuspend'])->assertRedirect();
    expect($server->fresh()->status)->toBeNull();
    $this->post($base . '/reinstall')->assertRedirect();
    expect($server->fresh()->status)->toBe(Server::STATUS_INSTALLING);
});

test('server removal releases its allocations and removes its database record', function (bool $force) {
    $server = $this->createServerModel();
    $this->daemon->shouldReceive('delete')->once();
    $this->post('/admin/servers/view/' . $server->id . '/delete', $force ? ['force_delete' => '1'] : [])->assertRedirect(route('admin.servers'));
    $this->assertDatabaseMissing('servers', ['id' => $server->id]);
    expect(Allocation::query()->findOrFail($server->allocation_id)->server_id)->toBeNull();
})->with([true, false]);

test('server mounts can be attached and detached without changing other servers', function () {
    $server = $this->createServerModel();
    $other = $this->createServerModel();
    $mount = (new Mount())->forceFill(['uuid' => Ramsey\Uuid\Uuid::uuid4()->toString(), 'name' => 'Server mount', 'source' => '/srv/shared', 'target' => '/mnt/shared', 'read_only' => true, 'user_mountable' => true]);
    $mount->saveOrFail();
    Pterodactyl\Models\MountServer::query()->forceCreate(['mount_id' => $mount->id, 'server_id' => $other->id]);
    $base = '/admin/servers/view/' . $server->id . '/mounts';
    $this->post($base, ['mount_id' => $mount->id])->assertRedirect();
    expect($server->mounts()->count())->toBe(1);
    $this->delete($base . '/' . $mount->id)->assertRedirect();
    expect($server->mounts()->count())->toBe(0)->and($other->mounts()->count())->toBe(1);
});

test('current and legacy Wings configuration preserve allocations environment and overrides', function (bool $legacy) {
    $server = $this->createServerModel();
    $service = app(ServerConfigurationStructureService::class);
    $config = $service->handle($server, ['memory' => 321, 'cpu' => 25], $legacy);
    expect($config['uuid'])->toBe($server->uuid)->and($config['suspended'])->toBe($legacy ? 0 : false);
    expect($config['build'][$legacy ? 'memory' : 'memory_limit'])->toBe(321)
        ->and($config['build'][$legacy ? 'cpu' : 'cpu_limit'])->toBe(25);
    expect($server->fresh()->memory)->not->toBe(321);
    if ($legacy) {
        expect($config['build']['ports'][$server->allocation->ip])->toContain($server->allocation->port);
        expect($config['service']['egg'])->toBe($server->egg->uuid);
    } else {
        expect($config['allocations']['default'])->toBe(['ip' => $server->allocation->ip, 'port' => $server->allocation->port]);
        expect($config['egg']['id'])->toBe($server->egg->uuid);
    }
})->with([true, false]);

test('server transfers reserve target allocations and sign a destination-scoped JWT', function () {
    $server = $this->createServerModel(['memory' => 512, 'disk' => 1024]);
    $destination = Node::factory()->create(['location_id' => Location::factory()->create()->id, 'memory' => 4096, 'disk' => 8192]);
    $allocations = Allocation::factory()->count(2)->create(['node_id' => $destination->id]);
    $daemon = $this->mock(DaemonTransferRepository::class);
    $daemon->shouldReceive('setServer')->once()->with(Mockery::on(fn ($value) => $value->id === $server->id))->andReturnSelf();
    $daemon->shouldReceive('notify')->once()->with(Mockery::on(fn ($value) => $value->id === $destination->id), Mockery::on(fn ($token) => $token->claims()->get('sub') === $server->uuid));
    $this->post('/admin/servers/view/' . $server->id . '/manage/transfer', ['node_id' => $destination->id, 'allocation_id' => $allocations[0]->id, 'allocation_additional' => [$allocations[1]->id, $server->allocation_id]])->assertRedirect();
    $transfer = ServerTransfer::query()->where('server_id', $server->id)->firstOrFail();
    expect($transfer->new_node)->toBe($destination->id)->and($transfer->new_additional_allocations)->toBe([$allocations[1]->id, $server->allocation_id]);
    foreach ($allocations as $allocation) {
        expect($allocation->fresh()->server_id)->toBe($server->id);
    }
});

test('transfers to nodes without sufficient capacity do not reserve allocations or contact Wings', function () {
    $server = $this->createServerModel(['memory' => 4096, 'disk' => 8192]);
    $destination = Node::factory()->create(['location_id' => Location::factory()->create()->id, 'memory' => 512, 'disk' => 1024]);
    $allocation = Allocation::factory()->create(['node_id' => $destination->id]);
    $this->mock(DaemonTransferRepository::class)->shouldNotReceive('setServer');
    $this->post('/admin/servers/view/' . $server->id . '/manage/transfer', ['node_id' => $destination->id, 'allocation_id' => $allocation->id])->assertRedirect();
    expect($allocation->fresh()->server_id)->toBeNull()->and(ServerTransfer::query()->where('server_id', $server->id)->exists())->toBeFalse();
});
