<?php

use Carbon\CarbonImmutable;
use Pterodactyl\Models\Egg;
use Illuminate\Http\Request;
use Pterodactyl\Models\Nest;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\ApiKey;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Subuser;
use Pterodactyl\Models\Database;
use Pterodactyl\Models\Location;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Models\EggVariable;
use Pterodactyl\Models\DatabaseHost;
use Pterodactyl\Models\ServerVariable;
use Pterodactyl\Services\Acl\Api\AdminAcl;
use Pterodactyl\Transformers\Api\Application\EggTransformer;
use Pterodactyl\Transformers\Api\Application\NestTransformer;
use Pterodactyl\Transformers\Api\Application\NodeTransformer;
use Pterodactyl\Transformers\Api\Application\ServerTransformer;
use Pterodactyl\Transformers\Api\Application\SubuserTransformer;
use Pterodactyl\Transformers\Api\Application\LocationTransformer;
use Pterodactyl\Transformers\Api\Application\AllocationTransformer;
use Pterodactyl\Transformers\Api\Application\EggVariableTransformer;
use Pterodactyl\Transformers\Api\Application\DatabaseHostTransformer;
use Pterodactyl\Transformers\Api\Application\ServerDatabaseTransformer;
use Pterodactyl\Transformers\Api\Application\ServerVariableTransformer;

function makeAppRequest(array $permissions = [], bool $isRoot = false): Request
{
    $request = Request::create('/api/application');
    $user = (new User())->forceFill(['id' => 1, 'root_admin' => $isRoot]);

    $tokenAttributes = ['key_type' => ApiKey::TYPE_APPLICATION];
    foreach ($permissions as $resource => $perm) {
        $tokenAttributes['r_' . $resource] = $perm;
    }
    $token = (new ApiKey())->forceFill($tokenAttributes);

    $userMock = Mockery::mock($user)->makePartial();
    $userMock->root_admin = $isRoot;
    $userMock->shouldReceive('currentAccessToken')->andReturn($token);

    $request->setUserResolver(fn () => $userMock);

    return $request;
}

test('allocation transformer transforms and includes node and server with authorization', function () {
    $requestNoPerm = makeAppRequest([]);
    $requestWithPerm = makeAppRequest([
        AdminAcl::RESOURCE_NODES => AdminAcl::READ,
        AdminAcl::RESOURCE_SERVERS => AdminAcl::READ,
    ]);

    $transformer = (new AllocationTransformer())->setRequest($requestWithPerm);
    expect($transformer->getResourceName())->toBe(Allocation::RESOURCE_NAME);

    $node = (new Node())->forceFill(['id' => 10, 'name' => 'Node 1']);
    $server = (new Server())->forceFill(['id' => 20, 'name' => 'Server 1']);
    $allocation = (new Allocation())->forceFill([
        'id' => 1,
        'ip' => '192.168.1.1',
        'ip_alias' => 'alias.example.com',
        'port' => 25565,
        'notes' => 'Primary',
        'server_id' => 20,
    ]);
    $allocation->setRelation('node', $node);
    $allocation->setRelation('server', $server);

    $transformed = $transformer->transform($allocation);
    expect($transformed['id'])->toBe(1)
        ->and($transformed['ip'])->toBe('192.168.1.1')
        ->and($transformed['assigned'])->toBeTrue();

    // Node include
    expect($transformer->includeNode($allocation))->toBeInstanceOf(League\Fractal\Resource\Item::class);
    $transformerNoPerm = (new AllocationTransformer())->setRequest($requestNoPerm);
    expect($transformerNoPerm->includeNode($allocation))->toBeInstanceOf(League\Fractal\Resource\NullResource::class);

    // Server include
    expect($transformer->includeServer($allocation))->toBeInstanceOf(League\Fractal\Resource\Item::class);
    expect($transformerNoPerm->includeServer($allocation))->toBeInstanceOf(League\Fractal\Resource\NullResource::class);

    // Server include when allocation has no server
    $unassignedAllocation = (new Allocation())->forceFill(['id' => 2, 'server_id' => null]);
    $unassignedAllocation->setRelation('server', null);
    expect($transformer->includeServer($unassignedAllocation))->toBeInstanceOf(League\Fractal\Resource\NullResource::class);
});

test('database host transformer transforms and includes databases', function () {
    $requestWithPerm = makeAppRequest([
        AdminAcl::RESOURCE_SERVER_DATABASES => AdminAcl::READ,
    ]);
    $transformer = (new DatabaseHostTransformer())->setRequest($requestWithPerm);
    expect($transformer->getResourceName())->toBe(DatabaseHost::RESOURCE_NAME);

    $now = CarbonImmutable::now();
    $host = (new DatabaseHost())->forceFill([
        'id' => 1,
        'name' => 'MySQL 1',
        'host' => '127.0.0.1',
        'port' => 3306,
        'username' => 'pterodactyl',
        'node_id' => 5,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $host->setRelation('databases', collect([
        (new Database())->forceFill(['id' => 1, 'database' => 'test_db']),
    ]));

    $transformed = $transformer->transform($host);
    expect($transformed['name'])->toBe('MySQL 1')
        ->and($transformed['port'])->toBe(3306)
        ->and($transformed['node'])->toBe(5);

    expect($transformer->includeDatabases($host))->toBeInstanceOf(League\Fractal\Resource\Collection::class);

    $transformerNoPerm = (new DatabaseHostTransformer())->setRequest(makeAppRequest([]));
    expect($transformerNoPerm->includeDatabases($host))->toBeInstanceOf(League\Fractal\Resource\NullResource::class);
});

test('server database transformer transforms, includes password and host', function () {
    $requestWithPerm = makeAppRequest([
        AdminAcl::RESOURCE_DATABASE_HOSTS => AdminAcl::READ,
    ]);
    $transformer = (new ServerDatabaseTransformer())->setRequest($requestWithPerm);
    expect($transformer->getResourceName())->toBe(Database::RESOURCE_NAME);

    $now = CarbonImmutable::now();
    $host = (new DatabaseHost())->forceFill(['id' => 1, 'name' => 'DB Host']);
    $encrypter = app(Illuminate\Contracts\Encryption\Encrypter::class);
    $database = (new Database())->forceFill([
        'id' => 2,
        'server_id' => 10,
        'database_host_id' => 1,
        'database' => 's10_db',
        'username' => 'u10_db',
        'remote' => '%',
        'max_connections' => 5,
        'password' => $encrypter->encrypt('supersecret'),
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $database->setRelation('host', $host);

    $transformed = $transformer->transform($database);
    expect($transformed['database'])->toBe('s10_db')
        ->and($transformed['server'])->toBe(10);

    // includePassword
    $passwordItem = $transformer->includePassword($database);
    expect($passwordItem)->toBeInstanceOf(League\Fractal\Resource\Item::class);
    $passwordClosure = $passwordItem->getTransformer();
    expect($passwordClosure($database))->toBe(['password' => 'supersecret']);

    // includeHost
    expect($transformer->includeHost($database))->toBeInstanceOf(League\Fractal\Resource\Item::class);

    $transformerNoPerm = (new ServerDatabaseTransformer())->setRequest(makeAppRequest([]));
    expect($transformerNoPerm->includeHost($database))->toBeInstanceOf(League\Fractal\Resource\NullResource::class);
});

test('subuser transformer transforms and includes user and server', function () {
    $requestWithPerm = makeAppRequest([
        AdminAcl::RESOURCE_USERS => AdminAcl::READ,
        AdminAcl::RESOURCE_SERVERS => AdminAcl::READ,
    ]);
    $transformer = (new SubuserTransformer())->setRequest($requestWithPerm);
    expect($transformer->getResourceName())->toBe(Subuser::RESOURCE_NAME);

    $user = (new User())->forceFill(['id' => 3, 'uuid' => '12345678-1234-1234-1234-123456789abc']);
    $server = (new Server())->forceFill(['id' => 4, 'uuid' => '23456789-2345-2345-2345-234567890abc']);
    $subuser = (new Subuser())->forceFill([
        'id' => 1,
        'user_id' => 3,
        'server_id' => 4,
        'permissions' => ['control.start', 'control.stop'],
        'created_at' => '2026-10-12 12:00:00',
        'updated_at' => '2026-10-12 12:00:00',
    ]);
    $subuser->setRelation('user', $user);
    $subuser->setRelation('server', $server);

    $transformed = $transformer->transform($subuser);
    expect($transformed['user_id'])->toBe(3)
        ->and($transformed['permissions'])->toBe(['control.start', 'control.stop']);

    expect($transformer->includeUser($subuser))->toBeInstanceOf(League\Fractal\Resource\Item::class)
        ->and($transformer->includeServer($subuser))->toBeInstanceOf(League\Fractal\Resource\Item::class);

    $transformerNoPerm = (new SubuserTransformer())->setRequest(makeAppRequest([]));
    expect($transformerNoPerm->includeUser($subuser))->toBeInstanceOf(League\Fractal\Resource\NullResource::class)
        ->and($transformerNoPerm->includeServer($subuser))->toBeInstanceOf(League\Fractal\Resource\NullResource::class);
});

test('server variable transformer transforms and includes parent variable', function () {
    $requestWithPerm = makeAppRequest([
        AdminAcl::RESOURCE_EGGS => AdminAcl::READ,
    ]);
    $transformer = (new ServerVariableTransformer())->setRequest($requestWithPerm);
    expect($transformer->getResourceName())->toBe(ServerVariable::RESOURCE_NAME);

    $parentEggVar = (new EggVariable())->forceFill(['id' => 5, 'name' => 'Parent Var']);
    $serverVar = (new EggVariable())->forceFill([
        'id' => 1,
        'name' => 'Server Jar',
        'server_value' => 'paper.jar',
    ]);
    $serverVar->setRelation('variable', $parentEggVar);

    $transformed = $transformer->transform($serverVar);
    expect($transformed['name'])->toBe('Server Jar');

    expect($transformer->includeParent($serverVar))->toBeInstanceOf(League\Fractal\Resource\Item::class);

    $transformerNoPerm = (new ServerVariableTransformer())->setRequest(makeAppRequest([]));
    expect($transformerNoPerm->includeParent($serverVar))->toBeInstanceOf(League\Fractal\Resource\NullResource::class);
});

test('nest transformer transforms and includes eggs and servers', function () {
    $requestWithPerm = makeAppRequest([
        AdminAcl::RESOURCE_EGGS => AdminAcl::READ,
        AdminAcl::RESOURCE_SERVERS => AdminAcl::READ,
    ]);
    $transformer = (new NestTransformer())->setRequest($requestWithPerm);
    expect($transformer->getResourceName())->toBe(Nest::RESOURCE_NAME);

    $nest = (new Nest())->forceFill([
        'id' => 1,
        'uuid' => '12345678-1234-1234-1234-123456789abc',
        'name' => 'Minecraft',
        'author' => 'support@pterodactyl.io',
        'created_at' => '2026-10-12 10:00:00',
        'updated_at' => '2026-10-12 10:00:00',
    ]);
    $nest->setRelation('eggs', collect([(new Egg())->forceFill(['id' => 1, 'name' => 'Paper'])]));
    $nest->setRelation('servers', collect([(new Server())->forceFill(['id' => 1, 'name' => 'MC Server'])]));

    $transformed = $transformer->transform($nest);
    expect($transformed['name'])->toBe('Minecraft');

    expect($transformer->includeEggs($nest))->toBeInstanceOf(League\Fractal\Resource\Collection::class)
        ->and($transformer->includeServers($nest))->toBeInstanceOf(League\Fractal\Resource\Collection::class);

    $transformerNoPerm = (new NestTransformer())->setRequest(makeAppRequest([]));
    expect($transformerNoPerm->includeEggs($nest))->toBeInstanceOf(League\Fractal\Resource\NullResource::class)
        ->and($transformerNoPerm->includeServers($nest))->toBeInstanceOf(League\Fractal\Resource\NullResource::class);
});

test('location transformer transforms and includes nodes and servers', function () {
    $requestWithPerm = makeAppRequest([
        AdminAcl::RESOURCE_NODES => AdminAcl::READ,
        AdminAcl::RESOURCE_SERVERS => AdminAcl::READ,
    ]);
    $transformer = (new LocationTransformer())->setRequest($requestWithPerm);
    expect($transformer->getResourceName())->toBe(Location::RESOURCE_NAME);

    $location = (new Location())->forceFill([
        'id' => 1,
        'short' => 'us.east',
        'long' => 'US East Region',
        'created_at' => '2026-10-12 10:00:00',
        'updated_at' => '2026-10-12 10:00:00',
    ]);
    $location->setRelation('nodes', collect([(new Node())->forceFill(['id' => 1, 'name' => 'Node 1'])]));
    $location->setRelation('servers', collect([(new Server())->forceFill(['id' => 1, 'name' => 'Server 1'])]));

    $transformed = $transformer->transform($location);
    expect($transformed['short'])->toBe('us.east')
        ->and($transformed['long'])->toBe('US East Region');

    expect($transformer->includeNodes($location))->toBeInstanceOf(League\Fractal\Resource\Collection::class)
        ->and($transformer->includeServers($location))->toBeInstanceOf(League\Fractal\Resource\Collection::class);

    $transformerNoPerm = (new LocationTransformer())->setRequest(makeAppRequest([]));
    expect($transformerNoPerm->includeNodes($location))->toBeInstanceOf(League\Fractal\Resource\NullResource::class)
        ->and($transformerNoPerm->includeServers($location))->toBeInstanceOf(League\Fractal\Resource\NullResource::class);
});

test('egg variable transformer transforms correctly', function () {
    $transformer = new EggVariableTransformer();
    expect($transformer->getResourceName())->toBe(Egg::RESOURCE_NAME);

    $var = (new EggVariable())->forceFill(['id' => 1, 'name' => 'Var1']);
    expect($transformer->transform($var))->toMatchArray(['id' => 1, 'name' => 'Var1']);
});

test('egg transformer includes config and script when extending', function () {
    $requestWithPerm = makeAppRequest([
        AdminAcl::RESOURCE_SERVERS => AdminAcl::READ,
        AdminAcl::RESOURCE_NESTS => AdminAcl::READ,
        AdminAcl::RESOURCE_EGGS => AdminAcl::READ,
    ]);

    $transformer = (new EggTransformer())->setRequest($requestWithPerm);
    expect($transformer->getResourceName())->toBe(Egg::RESOURCE_NAME);

    $eggWithoutInherit = (new Egg())->forceFill([
        'id' => 1,
        'config_from' => null,
        'copy_script_from' => null,
        'config_stop' => 'stop',
        'script_entry' => 'bash',
        'script_install' => 'echo 1',
        'script_container' => 'alpine',
    ]);
    expect($transformer->includeConfig($eggWithoutInherit))->toBeInstanceOf(League\Fractal\Resource\NullResource::class)
        ->and($transformer->includeScript($eggWithoutInherit))->toBeInstanceOf(League\Fractal\Resource\NullResource::class);

    $eggWithInherit = (new Egg())->forceFill([
        'id' => 2,
        'config_from' => 1,
        'copy_script_from' => 1,
        'inherit_config_files' => json_encode(['file.yml' => []]),
        'inherit_config_startup' => json_encode(['done' => 'Done']),
        'inherit_config_logs' => json_encode([]),
        'script_is_privileged' => true,
    ]);
    $eggWithInherit->setRelation('configFrom', $eggWithoutInherit);
    $eggWithInherit->setRelation('scriptFrom', $eggWithoutInherit);

    $configItem = $transformer->includeConfig($eggWithInherit);
    expect($configItem)->toBeInstanceOf(League\Fractal\Resource\Item::class);
    $configClosure = $configItem->getTransformer();
    $configData = $configClosure($eggWithInherit);
    expect($configData['stop'])->toBe('stop');

    $scriptItem = $transformer->includeScript($eggWithInherit);
    expect($scriptItem)->toBeInstanceOf(League\Fractal\Resource\Item::class);
    $scriptClosure = $scriptItem->getTransformer();
    $scriptData = $scriptClosure($eggWithInherit);
    expect($scriptData['privileged'])->toBeTrue()
        ->and($scriptData['install'])->toBe('echo 1');

    $eggWithInherit->setRelation('servers', collect([(new Server())->forceFill(['id' => 1])]));
    $eggWithInherit->setRelation('nest', (new Nest())->forceFill(['id' => 1, 'name' => 'Minecraft', 'created_at' => '2026-10-12 10:00:00', 'updated_at' => '2026-10-12 10:00:00']));
    $eggWithInherit->setRelation('variables', collect([(new EggVariable())->forceFill(['id' => 1, 'name' => 'Var'])]));

    expect($transformer->includeServers($eggWithInherit))->toBeInstanceOf(League\Fractal\Resource\Collection::class)
        ->and($transformer->includeNest($eggWithInherit))->toBeInstanceOf(League\Fractal\Resource\Item::class)
        ->and($transformer->includeVariables($eggWithInherit))->toBeInstanceOf(League\Fractal\Resource\Collection::class);

    // Test transform
    $eggForTransform = (new Egg())->forceFill([
        'id' => 10,
        'uuid' => '12345678-1234-1234-1234-123456789abc',
        'name' => 'Paper',
        'nest_id' => 1,
        'author' => 'support@pterodactyl.io',
        'description' => 'Paper server',
        'docker_images' => ['ghcr.io/pterodactyl/yoloks:java_17'],
        'config_files' => json_encode(['server.properties' => []]),
        'config_startup' => json_encode(['done' => 'Done']),
        'config_stop' => 'stop',
        'config_logs' => json_encode([]),
        'file_denylist' => [],
        'config_from' => null,
        'startup' => 'java -jar server.jar',
        'script_is_privileged' => false,
        'script_install' => 'echo 1',
        'script_entry' => 'bash',
        'script_container' => 'alpine',
        'copy_script_from' => null,
        'created_at' => '2026-10-12 10:00:00',
        'updated_at' => '2026-10-12 10:00:00',
    ]);
    $transformedEgg = $transformer->transform($eggForTransform);
    expect($transformedEgg['name'])->toBe('Paper')
        ->and($transformedEgg['docker_image'])->toBe('ghcr.io/pterodactyl/yoloks:java_17');

    // Test transform when config_files is empty object and docker_images is empty
    $eggEmpty = (new Egg())->forceFill([
        'id' => 11,
        'uuid' => '22345678-1234-1234-1234-123456789abc',
        'name' => 'Empty Egg',
        'docker_images' => [],
        'config_files' => json_encode([]),
        'config_startup' => json_encode([]),
        'config_stop' => 'stop',
        'config_logs' => json_encode([]),
        'file_denylist' => [],
        'config_from' => null,
        'startup' => 'bash',
        'script_is_privileged' => false,
        'script_install' => '',
        'script_entry' => '',
        'script_container' => '',
        'copy_script_from' => null,
        'created_at' => '2026-10-12 10:00:00',
        'updated_at' => '2026-10-12 10:00:00',
    ]);
    $transformedEmpty = $transformer->transform($eggEmpty);
    expect($transformedEmpty['docker_image'])->toBe('');

    $transformerNoPerm = (new EggTransformer())->setRequest(makeAppRequest([]));
    expect($transformerNoPerm->includeServers($eggWithInherit))->toBeInstanceOf(League\Fractal\Resource\NullResource::class)
        ->and($transformerNoPerm->includeNest($eggWithInherit))->toBeInstanceOf(League\Fractal\Resource\NullResource::class)
        ->and($transformerNoPerm->includeVariables($eggWithInherit))->toBeInstanceOf(League\Fractal\Resource\NullResource::class);
});

test('user transformer application transforms user', function () {
    $transformer = new Pterodactyl\Transformers\Api\Application\UserTransformer();
    expect($transformer->getResourceName())->toBe(User::RESOURCE_NAME);

    $now = CarbonImmutable::now();
    $user = (new User())->forceFill([
        'id' => 1,
        'external_id' => 'ext-1',
        'uuid' => '12345678-1234-1234-1234-123456789abc',
        'username' => 'testuser',
        'email' => 'test@example.com',
        'name_first' => 'Test',
        'name_last' => 'User',
        'language' => 'en',
        'root_admin' => true,
        'use_totp' => false,
        'gravatar' => true,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $data = $transformer->transform($user);
    expect($data['username'])->toBe('testuser')
        ->and($data['root_admin'])->toBeTrue();
});

test('node transformer transforms and includes relations', function () {
    $requestWithPerm = makeAppRequest([
        AdminAcl::RESOURCE_NODES => AdminAcl::READ,
        AdminAcl::RESOURCE_ALLOCATIONS => AdminAcl::READ,
        AdminAcl::RESOURCE_LOCATIONS => AdminAcl::READ,
        AdminAcl::RESOURCE_SERVERS => AdminAcl::READ,
    ]);
    $transformer = (new NodeTransformer())->setRequest($requestWithPerm);
    expect($transformer->getResourceName())->toBe(Node::RESOURCE_NAME);

    $now = CarbonImmutable::now();
    $node = Mockery::mock(Node::class)->makePartial();
    $node->forceFill([
        'id' => 1,
        'uuid' => '12345678-1234-1234-1234-123456789abc',
        'public' => true,
        'name' => 'Node 1',
        'description' => 'Test node',
        'location_id' => 2,
        'fqdn' => 'node.example.com',
        'scheme' => 'https',
        'behind_proxy' => false,
        'maintenance_mode' => false,
        'memory' => 1024,
        'memory_overallocate' => 0,
        'disk' => 10240,
        'disk_overallocate' => 0,
        'upload_size' => 100,
        'daemon_listen' => 8080,
        'daemon_sftp' => 2022,
        'daemon_base' => '/var/lib/pterodactyl/volumes',
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $relationQuery = Mockery::mock(Illuminate\Database\Eloquent\Relations\HasMany::class);
    $relationQuery->shouldReceive('select->get')->andReturn(collect([
        (object) ['memory' => 512, 'disk' => 1024],
    ]));
    $node->shouldReceive('servers')->andReturn($relationQuery);
    $node->setRelation('allocations', collect([(new Allocation())->forceFill(['id' => 1])]));
    $node->setRelation('location', (new Location())->forceFill(['id' => 2, 'short' => 'loc', 'long' => 'loc-long', 'created_at' => '2026-10-12 10:00:00', 'updated_at' => '2026-10-12 10:00:00']));
    $node->setRelation('servers', collect([(new Server())->forceFill(['id' => 1])]));

    $transformed = $transformer->transform($node);
    expect($transformed['name'])->toBe('Node 1')
        ->and($transformed['allocated_resources']['memory'])->toBe(512)
        ->and($transformed['allocated_resources']['disk'])->toBe(1024);

    expect($transformer->includeAllocations($node))->toBeInstanceOf(League\Fractal\Resource\Collection::class)
        ->and($transformer->includeLocation($node))->toBeInstanceOf(League\Fractal\Resource\Item::class)
        ->and($transformer->includeServers($node))->toBeInstanceOf(League\Fractal\Resource\Collection::class);

    $requestWithoutNodes = makeAppRequest([]);
    $transformerWithoutNodes = (new NodeTransformer())->setRequest($requestWithoutNodes);
    expect($transformerWithoutNodes->includeAllocations($node))->toBeInstanceOf(League\Fractal\Resource\NullResource::class)
        ->and($transformerWithoutNodes->includeLocation($node))->toBeInstanceOf(League\Fractal\Resource\NullResource::class)
        ->and($transformerWithoutNodes->includeServers($node))->toBeInstanceOf(League\Fractal\Resource\NullResource::class);
});

test('server transformer application includes relations with permissions', function () {
    $requestWithPerm = makeAppRequest([
        AdminAcl::RESOURCE_ALLOCATIONS => AdminAcl::READ,
        AdminAcl::RESOURCE_USERS => AdminAcl::READ,
        AdminAcl::RESOURCE_NESTS => AdminAcl::READ,
        AdminAcl::RESOURCE_EGGS => AdminAcl::READ,
        AdminAcl::RESOURCE_SERVERS => AdminAcl::READ,
        AdminAcl::RESOURCE_LOCATIONS => AdminAcl::READ,
        AdminAcl::RESOURCE_NODES => AdminAcl::READ,
        AdminAcl::RESOURCE_SERVER_DATABASES => AdminAcl::READ,
    ]);
    $transformer = (new ServerTransformer())->setRequest($requestWithPerm);
    expect($transformer->getResourceName())->toBe(Server::RESOURCE_NAME);

    $now = CarbonImmutable::now();
    $server = (new Server())->forceFill([
        'id' => 1,
        'external_id' => 'ext-srv',
        'uuid' => '12345678-1234-1234-1234-123456789abc',
        'name' => 'Server 1',
        'description' => 'Test server',
        'status' => null,
        'memory' => 1024,
        'swap' => 0,
        'disk' => 5120,
        'io' => 500,
        'cpu' => 100,
        'threads' => null,
        'oom_disabled' => true,
        'database_limit' => 1,
        'allocation_limit' => 2,
        'backup_limit' => 3,
        'owner_id' => 1,
        'node_id' => 1,
        'allocation_id' => 1,
        'nest_id' => 1,
        'egg_id' => 1,
        'startup' => 'java -jar server.jar',
        'image' => 'ghcr.io/pterodactyl/java:17',
        'skip_scripts' => false,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
    $server->syncOriginal();
    $server->setRelation('allocations', collect([(new Allocation())->forceFill(['id' => 1])]));
    $server->setRelation('subusers', collect([(new Subuser())->forceFill(['id' => 1])]));
    $server->setRelation('user', (new User())->forceFill(['id' => 1, 'uuid' => '23456789-2345-2345-2345-234567890abc']));
    $server->setRelation('nest', (new Nest())->forceFill(['id' => 1, 'name' => 'Nest', 'created_at' => '2026-10-12 10:00:00', 'updated_at' => '2026-10-12 10:00:00']));
    $server->setRelation('egg', (new Egg())->forceFill(['id' => 1, 'name' => 'Egg']));
    $server->setRelation('variables', collect([(new EggVariable())->forceFill(['id' => 1, 'name' => 'Var', 'env_variable' => 'TEST_VAR', 'default_value' => 'val'])]));
    $server->setRelation('location', (new Location())->forceFill(['id' => 1, 'short' => 'loc', 'long' => 'loc-long', 'created_at' => '2026-10-12 10:00:00', 'updated_at' => '2026-10-12 10:00:00']));
    $server->setRelation('node', (new Node())->forceFill(['id' => 1, 'name' => 'Node']));
    $server->setRelation('databases', collect([(new Database())->forceFill(['id' => 1])]));

    $transformedServer = $transformer->transform($server);
    expect($transformedServer['name'])->toBe('Server 1')
        ->and($transformedServer['external_id'])->toBe('ext-srv')
        ->and($transformedServer['container']['startup_command'])->toBe('java -jar server.jar');

    expect($transformer->includeAllocations($server))->toBeInstanceOf(League\Fractal\Resource\Collection::class)

        ->and($transformer->includeSubusers($server))->toBeInstanceOf(League\Fractal\Resource\Collection::class)
        ->and($transformer->includeUser($server))->toBeInstanceOf(League\Fractal\Resource\Item::class)
        ->and($transformer->includeNest($server))->toBeInstanceOf(League\Fractal\Resource\Item::class)
        ->and($transformer->includeEgg($server))->toBeInstanceOf(League\Fractal\Resource\Item::class)
        ->and($transformer->includeVariables($server))->toBeInstanceOf(League\Fractal\Resource\Collection::class)
        ->and($transformer->includeLocation($server))->toBeInstanceOf(League\Fractal\Resource\Item::class)
        ->and($transformer->includeNode($server))->toBeInstanceOf(League\Fractal\Resource\Item::class)
        ->and($transformer->includeDatabases($server))->toBeInstanceOf(League\Fractal\Resource\Collection::class);

    $transformerNoPerm = (new ServerTransformer())->setRequest(makeAppRequest([]));
    expect($transformerNoPerm->includeAllocations($server))->toBeInstanceOf(League\Fractal\Resource\NullResource::class)
        ->and($transformerNoPerm->includeSubusers($server))->toBeInstanceOf(League\Fractal\Resource\NullResource::class)
        ->and($transformerNoPerm->includeUser($server))->toBeInstanceOf(League\Fractal\Resource\NullResource::class)
        ->and($transformerNoPerm->includeNest($server))->toBeInstanceOf(League\Fractal\Resource\NullResource::class)
        ->and($transformerNoPerm->includeEgg($server))->toBeInstanceOf(League\Fractal\Resource\NullResource::class)
        ->and($transformerNoPerm->includeVariables($server))->toBeInstanceOf(League\Fractal\Resource\NullResource::class)
        ->and($transformerNoPerm->includeLocation($server))->toBeInstanceOf(League\Fractal\Resource\NullResource::class)
        ->and($transformerNoPerm->includeNode($server))->toBeInstanceOf(League\Fractal\Resource\NullResource::class)
        ->and($transformerNoPerm->includeDatabases($server))->toBeInstanceOf(League\Fractal\Resource\NullResource::class);
});
