<?php

use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Pterodactyl\Models\ApiKey;
use Pterodactyl\Models\Server;
use Pterodactyl\Services\Acl\Api\AdminAcl;
use Pterodactyl\Transformers\Api\Application\BaseTransformer;
use Pterodactyl\Transformers\Api\Client\BaseClientTransformer;

class DummyHandledTransformer extends BaseTransformer
{
    public bool $handled = false;

    public function handle(): void
    {
        $this->handled = true;
    }

    public function getResourceName(): string
    {
        return 'dummy_handled';
    }
}

class DummyApplicationTransformer extends BaseTransformer
{
    public function getResourceName(): string
    {
        return 'dummy';
    }

    public function testAuthorize(string $resource): bool
    {
        return $this->authorize($resource);
    }

    public function testFormatTimestamp(string $timestamp): string
    {
        return $this->formatTimestamp($timestamp);
    }

    public function testMakeTransformer(string $class)
    {
        return $this->makeTransformer($class);
    }
}

class DummyClientTransformer extends BaseClientTransformer
{
    public function getResourceName(): string
    {
        return 'dummy_client';
    }

    public function testAuthorize(string $ability, ?Server $server = null): bool
    {
        return $this->authorize($ability, $server);
    }

    public function testMakeTransformer(string $class)
    {
        return $this->makeTransformer($class);
    }
}

test('base transformer returns false when user has no token or non-api-key token', function () {
    $transformer = new DummyApplicationTransformer();
    $request = Request::create('/test');
    $transformer->setRequest($request);

    expect($transformer->testAuthorize('test'))->toBeFalse();

    $user = (new User())->forceFill(['root_admin' => false]);
    $request->setUserResolver(fn () => $user);
    expect($transformer->testAuthorize('test'))->toBeFalse();
});

test('base transformer authorizes root admin with account api key', function () {
    $transformer = new DummyApplicationTransformer();
    $request = Request::create('/test');

    $token = (new ApiKey())->forceFill(['key_type' => ApiKey::TYPE_ACCOUNT]);
    $user = (new User())->forceFill(['root_admin' => true]);
    $user->setRelation('tokens', collect([$token]));
    $request->setUserResolver(fn () => $user);
    $request->attributes->set('sanctum_token', $token);

    // Mock currentAccessToken on user
    $userMock = Mockery::mock($user)->makePartial();
    $userMock->root_admin = true;
    $userMock->shouldReceive('currentAccessToken')->andReturn($token);
    $request->setUserResolver(fn () => $userMock);

    $transformer->setRequest($request);

    expect($transformer->testAuthorize('test'))->toBeTrue();
});

test('base transformer delegates to AdminAcl when using application api key', function () {
    $transformer = new DummyApplicationTransformer();
    $request = Request::create('/test');

    $token = (new ApiKey())->forceFill([
        'key_type' => ApiKey::TYPE_APPLICATION,
        'r_' . AdminAcl::RESOURCE_USERS => AdminAcl::READ,
    ]);
    $user = (new User())->forceFill(['root_admin' => false]);
    $userMock = Mockery::mock($user)->makePartial();
    $userMock->shouldReceive('currentAccessToken')->andReturn($token);

    $request->setUserResolver(fn () => $userMock);
    $transformer->setRequest($request);

    expect($transformer->testAuthorize(AdminAcl::RESOURCE_USERS))->toBeTrue()
        ->and($transformer->testAuthorize(AdminAcl::RESOURCE_SERVERS))->toBeFalse();
});

test('base transformer formats timestamp to UTC atom string', function () {
    $transformer = new DummyApplicationTransformer();
    $formatted = $transformer->testFormatTimestamp('2026-10-12 15:30:00');
    expect(str_ends_with($formatted, '+00:00'))->toBeTrue();
});

test('base client transformer returns user and checks permissions', function () {
    $transformer = new DummyClientTransformer();
    $request = Request::create('/test');

    $server = (new Server())->forceFill(['id' => 1]);
    $user = Mockery::mock(User::class);
    $user->shouldReceive('can')->with('view', Mockery::on(fn ($args) => $args[0] === $server))->andReturn(true);

    $request->setUserResolver(fn () => $user);
    $transformer->setRequest($request);

    expect($transformer->getUser())->toBe($user)
        ->and($transformer->testAuthorize('view', $server))->toBeTrue();
});

test('base transformer can instantiate child transformers', function () {
    $transformer = new DummyApplicationTransformer();
    $request = Request::create('/test');
    $transformer->setRequest($request);

    $child = $transformer->testMakeTransformer(DummyApplicationTransformer::class);
    expect($child)->toBeInstanceOf(DummyApplicationTransformer::class);

    $clientTransformer = new DummyClientTransformer();
    $clientTransformer->setRequest($request);
    $clientChild = $clientTransformer->testMakeTransformer(DummyClientTransformer::class);
    expect($clientChild)->toBeInstanceOf(DummyClientTransformer::class);
});

test('base transformer invokes handle method on construct if present', function () {
    $transformer = new DummyHandledTransformer();
    expect($transformer->handled)->toBeTrue();
});
