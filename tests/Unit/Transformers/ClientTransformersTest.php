<?php

use Carbon\CarbonImmutable;
use Pterodactyl\Models\Egg;
use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Subuser;
use Pterodactyl\Models\Database;
use Pterodactyl\Models\Permission;
use Pterodactyl\Models\ActivityLog;
use Pterodactyl\Models\EggVariable;
use Pterodactyl\Models\DatabaseHost;
use Pterodactyl\Transformers\Api\Client\EggTransformer;
use Pterodactyl\Transformers\Api\Client\UserTransformer;
use Pterodactyl\Transformers\Api\Client\ServerTransformer;
use Pterodactyl\Transformers\Api\Client\DatabaseTransformer;
use Pterodactyl\Transformers\Api\Client\ActivityLogTransformer;
use Pterodactyl\Transformers\Api\Client\EggVariableTransformer;

function makeClientRequest(?User $user = null): Request
{
    $request = Request::create('/api/client');
    $user = $user ?? (new User())->forceFill(['id' => 1, 'root_admin' => false]);
    $request->setUserResolver(fn () => $user);

    return $request;
}

test('client egg transformer transforms correctly', function () {
    $transformer = (new EggTransformer())->setRequest(makeClientRequest());
    $egg = (new Egg())->forceFill([
        'uuid' => 'test-egg-uuid',
        'name' => 'Minecraft',
    ]);

    expect($transformer->getResourceName())->toBe(Egg::RESOURCE_NAME)
        ->and($transformer->transform($egg))->toBe([
            'uuid' => 'test-egg-uuid',
            'name' => 'Minecraft',
        ]);
});

test('client activity log transformer transforms and handles metadata, properties, and ip visibility', function () {
    $user = (new User())->forceFill(['id' => 1, 'root_admin' => false]);
    $admin = (new User())->forceFill(['id' => 2, 'root_admin' => true]);
    $other = (new User())->forceFill(['id' => 3, 'root_admin' => false]);

    $transformer = (new ActivityLogTransformer())->setRequest(makeClientRequest($user));
    expect($transformer->getResourceName())->toBe(ActivityLog::RESOURCE_NAME);

    // Empty properties
    $log1 = (new ActivityLog())->forceFill([
        'id' => 1,
        'batch' => null,
        'event' => 'server:console.command',
        'api_key_id' => null,
        'ip' => '1.2.3.4',
        'description' => 'Ran command',
        'properties' => collect([]),
        'timestamp' => CarbonImmutable::now(),
    ]);
    $log1->setRelation('actor', $user);

    $transformed1 = $transformer->transform($log1);
    expect($transformed1['ip'])->toBe('1.2.3.4')
        ->and($transformed1['is_api'])->toBeFalse()
        ->and($transformed1['properties'])->toEqual((object) [])
        ->and($transformed1['has_additional_metadata'])->toBeFalse();

    // Actor includes user or null
    $includeUser = $transformer->includeActor($log1);
    expect($includeUser->getData())->toBe($user);

    $log1->setRelation('actor', null);
    expect($transformer->includeActor($log1))->toBeInstanceOf(League\Fractal\Resource\NullResource::class);

    // Properties only containing excluded keys -> loops through and hits line 107 return false
    $logOnlyExcluded = (new ActivityLog())->forceFill([
        'id' => 3,
        'batch' => null,
        'event' => 'server:console.command',
        'api_key_id' => null,
        'ip' => '1.2.3.4',
        'description' => 'Ran command',
        'properties' => collect(['ip' => '1.2.3.4']),
        'timestamp' => CarbonImmutable::now(),
    ]);
    $logOnlyExcluded->setRelation('actor', $user);
    expect($transformer->transform($logOnlyExcluded)['has_additional_metadata'])->toBeFalse();

    // Viewer is not actor and not admin -> IP is hidden, properties with directory & array counts
    $log2 = (new ActivityLog())->forceFill([
        'id' => 2,
        'batch' => 'batch-123',
        'event' => 'server:file.upload',
        'api_key_id' => 10,
        'ip' => '5.6.7.8',
        'description' => 'Uploaded files',
        'properties' => collect([
            'ip' => '5.6.7.8',
            'directory' => '/plugins//subfolder/',
            'files' => ['a.txt', 'b.txt'],
            'extra_custom' => 'val',
        ]),
        'timestamp' => CarbonImmutable::now(),
    ]);
    $log2->setRelation('actor', $other);

    $transformed2 = $transformer->transform($log2);
    expect($transformed2['ip'])->toBeNull()
        ->and($transformed2['is_api'])->toBeTrue()
        ->and($transformed2['properties']->ip)->toBe('[hidden]')
        ->and($transformed2['properties']->directory)->toBe('/plugins/subfolder/')
        ->and($transformed2['properties']->count)->toBe(2)
        ->and($transformed2['has_additional_metadata'])->toBeTrue();

    // Viewer is root admin -> can view IP of another actor
    $adminTransformer = (new ActivityLogTransformer())->setRequest(makeClientRequest($admin));
    $transformedAdmin = $adminTransformer->transform($log2);
    expect($transformedAdmin['ip'])->toBe('5.6.7.8');
});

test('client database transformer handles password include authorization', function () {
    $userMock = Mockery::mock(User::class);
    $request = Request::create('/api/client');
    $request->setUserResolver(fn () => $userMock);

    $transformer = (new DatabaseTransformer())->setRequest($request);
    expect($transformer->getResourceName())->toBe(Database::RESOURCE_NAME);

    $host = (new DatabaseHost())->forceFill(['host' => '127.0.0.1', 'port' => 3306]);
    $server = (new Server())->forceFill(['id' => 1]);
    $db = (new Database())->forceFill([
        'id' => 1,
        'database' => 's1_test',
        'username' => 'u1_test',
        'remote' => '%',
        'max_connections' => 10,
        'password' => 'secret',
    ]);
    $db->setRelation('host', $host);
    $db->setRelation('server', $server);

    $transformed = $transformer->transform($db);
    expect($transformed['host']['address'])->toBe('127.0.0.1')
        ->and($transformed['name'])->toBe('s1_test');

    // Without permission
    $userMock->shouldReceive('can')->with(Permission::ACTION_DATABASE_VIEW_PASSWORD, Mockery::any())->once()->andReturn(false);
    expect($transformer->includePassword($db))->toBeInstanceOf(League\Fractal\Resource\NullResource::class);

    // With permission
    $userMock->shouldReceive('can')->with(Permission::ACTION_DATABASE_VIEW_PASSWORD, Mockery::any())->once()->andReturn(true);
    $encrypter = app(Illuminate\Contracts\Encryption\Encrypter::class);
    $db->password = $encrypter->encrypt('decrypted_password');
    $item = $transformer->includePassword($db);
    expect($item)->toBeInstanceOf(League\Fractal\Resource\Item::class);
    $passwordClosure = $item->getTransformer();
    expect($passwordClosure($db))->toBe(['password' => 'decrypted_password']);
});

test('client egg variable transformer throws exception for non-user viewable variable', function () {
    $transformer = (new EggVariableTransformer())->setRequest(makeClientRequest());
    expect($transformer->getResourceName())->toBe(EggVariable::RESOURCE_NAME);

    $hiddenVar = (new EggVariable())->forceFill([
        'user_viewable' => false,
        'name' => 'Hidden',
    ]);

    expect(fn () => $transformer->transform($hiddenVar))->toThrow(
        BadMethodCallException::class,
        'Cannot transform a hidden egg variable in a client transformer.'
    );

    $visibleVar = (new EggVariable())->forceFill([
        'user_viewable' => true,
        'name' => 'Visible',
        'description' => 'Test var',
        'env_variable' => 'VAR_1',
        'default_value' => 'default',
        'server_value' => 'custom',
        'user_editable' => true,
        'rules' => 'required|string',
    ]);

    $data = $transformer->transform($visibleVar);
    expect($data['name'])->toBe('Visible')
        ->and($data['server_value'])->toBe('custom');
});

test('client server transformer includes egg and subusers with permissions', function () {
    $userMock = Mockery::mock(User::class);
    $request = Request::create('/api/client');
    $request->setUserResolver(fn () => $userMock);

    $transformer = (new ServerTransformer())->setRequest($request);

    $server = (new Server())->forceFill(['id' => 1]);
    $egg = (new Egg())->forceFill(['uuid' => '12345678-1234-1234-1234-123456789abc', 'name' => 'Paper']);
    $server->setRelation('egg', $egg);
    $server->setRelation('subusers', collect([
        (new Subuser())->forceFill(['id' => 1]),
    ]));

    $eggItem = $transformer->includeEgg($server);
    expect($eggItem)->toBeInstanceOf(League\Fractal\Resource\Item::class);

    // Subusers without permission
    $userMock->shouldReceive('can')->with(Permission::ACTION_USER_READ, Mockery::any())->once()->andReturn(false);
    expect($transformer->includeSubusers($server))->toBeInstanceOf(League\Fractal\Resource\NullResource::class);

    // Subusers with permission
    $userMock->shouldReceive('can')->with(Permission::ACTION_USER_READ, Mockery::any())->once()->andReturn(true);
    $subusersCollection = $transformer->includeSubusers($server);
    expect($subusersCollection)->toBeInstanceOf(League\Fractal\Resource\Collection::class);
});

test('client user transformer falls back to gravatar when avatar_url is null', function () {
    $transformer = (new UserTransformer())->setRequest(makeClientRequest());
    expect($transformer->getResourceName())->toBe(User::RESOURCE_NAME);

    $userWithoutAvatar = (new User())->forceFill([
        'uuid' => '12345678-1234-1234-1234-123456789abc',
        'username' => 'testuser',
        'email' => 'test@example.com',
        'avatar_url' => null,
        'use_totp' => false,
        'created_at' => CarbonImmutable::now(),
    ]);
    $userWithoutAvatar->syncOriginal();

    $transformed = $transformer->transform($userWithoutAvatar);
    expect($transformed['image'])->toContain('https://gravatar.com/avatar/')
        ->and($transformed['avatar_url'])->toBeNull();

    $userWithAvatar = (new User())->forceFill([
        'uuid' => '23456789-2345-2345-2345-234567890abc',
        'username' => 'testuser2',
        'email' => 'test2@example.com',
        'avatar' => 'avatars/custom.png',
        'use_totp' => true,
        'created_at' => CarbonImmutable::now(),
    ]);
    $userWithAvatar->syncOriginal();

    $transformed2 = $transformer->transform($userWithAvatar);
    expect($transformed2['image'])->toBe('/storage/avatars/custom.png')
        ->and($transformed2['avatar_url'])->toBe('/storage/avatars/custom.png')
        ->and($transformed2['2fa_enabled'])->toBeTrue();
});
