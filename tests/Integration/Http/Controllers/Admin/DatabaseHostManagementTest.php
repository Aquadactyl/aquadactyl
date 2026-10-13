<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Database;
use Pterodactyl\Models\DatabaseHost;
use Illuminate\Database\DatabaseManager;
use Illuminate\Database\ConnectionInterface;
use Illuminate\Contracts\Encryption\Encrypter;
use Pterodactyl\Extensions\DynamicDatabaseConnection;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Helpers\SoftwareVersionService;
use Pterodactyl\Services\Databases\Hosts\HostUpdateService;
use Pterodactyl\Exceptions\Service\HasActiveServersException;
use Pterodactyl\Services\Databases\Hosts\HostCreationService;
use Pterodactyl\Contracts\Repository\DatabaseHostRepositoryInterface;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set('pterodactyl.auth.2fa_required', 0);
    app('cache')->forever(SoftwareVersionService::VERSION_CACHE_KEY, ['panel' => '1.0.0', 'wings' => '1.0.0']);
    $this->actingAs(User::factory()->create(['root_admin' => true]));
    $this->remote = Mockery::mock(ConnectionInterface::class);
    $manager = Mockery::mock(DatabaseManager::class);
    $manager->shouldReceive('connection')->with('dynamic')->andReturn($this->remote);
    $arguments = [app(ConnectionInterface::class), $manager, app(DynamicDatabaseConnection::class), app(Encrypter::class), app(DatabaseHostRepositoryInterface::class)];
    $this->app->instance(HostCreationService::class, new HostCreationService(...$arguments));
    $this->app->instance(HostUpdateService::class, new HostUpdateService(...$arguments));
    $this->payload = ['name' => 'Coverage database host', 'host' => 'database.example.test', 'port' => 3306, 'username' => 'panel', 'password' => 'TestingPassword123!', 'node_id' => ''];
});

test('database hosts verify credentials encrypt passwords and retain them on blank updates', function () {
    $this->remote->shouldReceive('select')->times(3)->with('SELECT 1 FROM dual')->andReturn([]);
    $this->post('/admin/databases', $this->payload)->assertRedirect();
    $host = DatabaseHost::query()->where('name', $this->payload['name'])->firstOrFail();
    expect(decrypt($host->password))->toBe($this->payload['password'])->and($host->node_id)->toBeNull();
    $this->get('/admin/databases/view/' . $host->id)->assertOk()->assertSee($host->name);
    $this->patch('/admin/databases/view/' . $host->id, array_replace($this->payload, ['name' => 'Renamed host', 'password' => '']))->assertRedirect();
    expect(decrypt($host->fresh()->password))->toBe($this->payload['password']);
    $this->patch('/admin/databases/view/' . $host->id, array_replace($this->payload, ['password' => 'ChangedPassword123!']))->assertRedirect();
    expect(decrypt($host->fresh()->password))->toBe('ChangedPassword123!');
    $this->delete('/admin/databases/view/' . $host->id)->assertRedirect(route('admin.databases'));
    $this->assertDatabaseMissing('database_hosts', ['id' => $host->id]);
});

test('failed host connections roll back credentials and show a retryable error', function (string $operation, bool $wrapped) {
    $failure = new PDOException('Connection refused');
    if ($wrapped) {
        $failure = new RuntimeException('Connection refused', 0, $failure);
    }
    $this->remote->shouldReceive('select')->once()->andThrow($failure);
    if ($operation === 'create') {
        $this->post('/admin/databases', $this->payload)->assertRedirect(route('admin.databases'));
        $this->assertDatabaseMissing('database_hosts', ['name' => $this->payload['name']]);
    } else {
        $host = DatabaseHost::factory()->create();
        $this->patch('/admin/databases/view/' . $host->id, $this->payload)->assertRedirect();
        expect($host->fresh()->name)->toBe($host->name);
    }
    expect(app(Prologue\Alerts\AlertsMessageBag::class)->get('danger'))->not->toBeEmpty();
})->with([['create', true], ['create', false], ['update', true], ['update', false]]);

test('unrelated host failures are rethrown and preserve stored data', function (string $operation) {
    $this->withoutExceptionHandling();
    $this->remote->shouldReceive('select')->once()->andThrow(new RuntimeException('unexpected remote failure'));
    if ($operation === 'create') {
        expect(fn () => $this->post('/admin/databases', $this->payload))->toThrow(RuntimeException::class, 'unexpected remote failure');
    } else {
        $host = DatabaseHost::factory()->create();
        expect(fn () => $this->patch('/admin/databases/view/' . $host->id, $this->payload))->toThrow(RuntimeException::class, 'unexpected remote failure');
        expect($host->fresh()->name)->toBe($host->name);
    }
})->with(['create', 'update']);

test('hosts with databases cannot be removed', function () {
    $this->withoutExceptionHandling();
    $server = $this->createServerModel();
    $host = DatabaseHost::factory()->create();
    Database::factory()->create(['server_id' => $server->id, 'database_host_id' => $host->id]);
    expect(fn () => $this->delete('/admin/databases/view/' . $host->id))->toThrow(HasActiveServersException::class);
    $this->assertDatabaseHas('database_hosts', ['id' => $host->id]);
});
