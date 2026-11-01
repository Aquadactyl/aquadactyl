<?php

use Pterodactyl\Models\Mount;
use Pterodactyl\Models\ApiKey;
use Pterodactyl\Models\MountServer;
use Pterodactyl\Models\DatabaseHost;
use Pterodactyl\Models\ServerVariable;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Repositories\Eloquent\LocationRepository;
use Pterodactyl\Repositories\Eloquent\EggVariableRepository;
use Pterodactyl\Services\Servers\ServerConfigurationStructureService;

uses(DatabaseTransactions::class);

test('server variables expose their actual egg definitions and owning servers', function () {
    $server = $this->createServerModel();
    $variable = $server->variables->first();
    $stored = ServerVariable::forceCreate(['server_id' => $server->id, 'variable_id' => $variable->id, 'variable_value' => 'testing']);
    expect($stored->server->id)->toBe($server->id)->and($stored->variable->id)->toBe($variable->id);
    expect($variable->required)->toBe(in_array('required', explode('|', $variable->rules)));
    expect($variable->serverVariable->pluck('id'))->toContain($stored->id);
    expect($variable->egg->id)->toBe($server->egg_id);
    $repository = app(EggVariableRepository::class);
    expect($repository->getEditableVariables($server->egg_id)->every(fn ($item) => $item->user_viewable && $item->user_editable))->toBeTrue();
});

test('locations mounts and database hosts load their owned resources and fail on missing records', function () {
    $server = $this->createServerModel();
    $repository = app(LocationRepository::class);
    expect($repository->getAllWithDetails()->firstWhere('id', $server->node->location_id)->nodes_count)->toBeGreaterThanOrEqual(1);
    expect($repository->getWithNodes($server->node->location_id)->nodes->pluck('id'))->toContain($server->node_id);
    expect($repository->getWithNodeCount($server->node->location_id)->nodes_count)->toBeGreaterThanOrEqual(1);
    expect(fn () => $repository->getWithNodeCount(PHP_INT_MAX))->toThrow(Pterodactyl\Exceptions\Repository\RecordNotFoundException::class);
    expect(fn () => $repository->getWithNodes(PHP_INT_MAX))->toThrow(Pterodactyl\Exceptions\Repository\RecordNotFoundException::class);
    expect($server->node->location->getRouteKeyName())->toBe('id')->and($server->node->getSftpHost())->toBe($server->node->getSftpDomain());
    $host = DatabaseHost::factory()->create(['node_id' => $server->node_id]);
    expect($host->node->id)->toBe($server->node_id);
    $mount = Mount::forceCreate(['uuid' => fake()->uuid(), 'name' => 'Relation mount', 'description' => 'Test mount', 'source' => '/srv/coverage', 'target' => '/mnt/coverage', 'read_only' => true, 'user_mountable' => false]);
    MountServer::forceCreate(['server_id' => $server->id, 'mount_id' => $mount->id]);
    expect($mount->servers->pluck('id'))->toContain($server->id);
    expect(app(ServerConfigurationStructureService::class)->handle($server->refresh())['mounts'][0])->toBe(['source' => $mount->source, 'target' => $mount->target, 'read_only' => $mount->read_only]);
    expect(fn () => app(Pterodactyl\Repositories\Eloquent\MountRepository::class)->getWithRelations(PHP_INT_MAX))->toThrow(Pterodactyl\Exceptions\Repository\RecordNotFoundException::class);
});

test('eggs inherit features and file deny lists from their explicitly selected configuration source', function () {
    $server = $this->createServerModel();
    $source = $this->cloneEggAndVariables($server->egg);
    $source->forceFill(['features' => ['eula'], 'file_denylist' => ['secret.key']])->save();
    $copy = $this->cloneEggAndVariables($server->egg);
    $copy->forceFill(['config_from' => $source->id, 'features' => null, 'file_denylist' => null])->save();
    expect($copy->inherit_features)->toBe(['eula'])->and($copy->inherit_file_denylist)->toBe(['secret.key']);
});

test('legacy hash identifiers recovery-token ownership and API key abilities remain consistent', function () {
    [$user, $server] = $this->generateTestAccount(['control.console']);
    $schedule = Pterodactyl\Models\Schedule::factory()->create(['server_id' => $server->id]);
    $task = Pterodactyl\Models\Task::factory()->create(['schedule_id' => $schedule->id]);
    expect($server->allocation->hashid)->toBe(app('hashids')->encode($server->allocation->id));
    expect($server->allocation->has_alias)->toBe(!is_null($server->allocation->ip_alias));
    expect($task->hashid)->toBe(app('hashids')->encode($task->id));
    $token = $user->recoveryTokens()->forceCreate(['token' => password_hash('test', PASSWORD_DEFAULT)]);
    expect($token->user->id)->toBe($user->id);
    $key = ApiKey::factory()->make(['key_type' => ApiKey::TYPE_APPLICATION, 'r_nodes' => 1]);
    expect($key->can('nodes'))->toBeTrue()->and($key->can('users'))->toBeFalse();
    $absent = ApiKey::factory()->make(['user_id' => PHP_INT_MAX]);
    expect($absent->tokenable)->toBeNull();
    expect($server->subusers->first()->permissions())->toBeInstanceOf(Illuminate\Database\Eloquent\Relations\HasMany::class);
});
