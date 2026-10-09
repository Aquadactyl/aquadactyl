<?php

use Carbon\CarbonImmutable;
use Illuminate\Http\Response;
use Pterodactyl\Enum\JwtScope;
use Lcobucci\JWT\Configuration;
use Pterodactyl\Models\Permission;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use Lcobucci\JWT\Signer\Key\InMemory;
use Lcobucci\JWT\Validation\Constraint\SignedWith;

test('subuser without websocket permission receives error', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_CONTROL_RESTART]);

    $this->actingAs($user)->getJson("/api/client/servers/$server->uuid/websocket")
        ->assertStatus(Response::HTTP_FORBIDDEN)
        ->assertJsonPath('errors.0.code', 'HttpForbiddenException')
        ->assertJsonPath('errors.0.detail', 'You do not have permission to connect to this server\'s websocket.');
});

test('user without permission for server receives error', function () {
    [, $server] = $this->generateTestAccount([Permission::ACTION_WEBSOCKET_CONNECT]);
    [$user] = $this->generateTestAccount([Permission::ACTION_WEBSOCKET_CONNECT]);

    $this->actingAs($user)->getJson("/api/client/servers/$server->uuid/websocket")
        ->assertStatus(Response::HTTP_NOT_FOUND);
});

test('jwt and websocket url are returned for server owner', function () {
    /** @var \Pterodactyl\Models\User $user */
    /** @var \Pterodactyl\Models\Server $server */
    [$user, $server] = $this->generateTestAccount();

    // Force the node to HTTPS since we want to confirm it gets transformed to wss:// in the URL.
    $server->node->scheme = 'https';
    $server->node->save();

    $response = $this->actingAs($user)
        ->withoutExceptionHandling()
        ->getJson("/api/client/servers/$server->uuid/websocket")
        ->assertOk()
        ->assertJsonStructure(['data' => ['token', 'socket']]);

    $connection = $response->json('data.socket');
    expect($connection)->toStartWith('wss://')
        ->and($connection)->toEndWith("/api/servers/$server->uuid/ws");

    $config = Configuration::forSymmetricSigner(new Sha256(), $key = InMemory::plainText($server->node->getDecryptedKey()));
    $config = $config->withValidationConstraints(new SignedWith(new Sha256(), $key));

    /** @var \Lcobucci\JWT\Token\Plain $token */
    $token = $config->parser()->parse($response->json('data.token'));

    expect($config->validator()->validate($token, ...$config->validationConstraints()))->toBeTrue();

    // The way we generate times for the JWT will truncate the microseconds from the
    // time, but CarbonImmutable::now() will include them, thus causing test failures.
    //
    // This little chunk of logic just strips those out by generating a new CarbonImmutable
    // instance from the current timestamp, which is how the JWT works. We also need to
    // switch to UTC here for consistency.
    $expect = CarbonImmutable::createFromTimestamp(CarbonImmutable::now()->getTimestamp())->timezone('UTC');

    // Check that the claims are generated correctly.
    expect($token->hasBeenIssuedBy(config('app.url')))->toBeTrue()
        ->and($token->isPermittedFor($server->node->getConnectionAddress()))->toBeTrue()
        ->and($token->claims()->get('iat'))->toEqual($expect)
        ->and($token->claims()->get('nbf'))->toEqual($expect->subMinutes(5))
        ->and($token->claims()->get('exp'))->toEqual($expect->addMinutes(10))
        ->and($token->claims()->get('user_uuid'))->toBe($user->uuid)
        ->and($token->claims()->get('server_uuid'))->toBe($server->uuid)
        ->and($token->claims()->get('permissions'))->toBe(['*'])
        ->and($token->claims()->get('scope'))->toBe(JwtScope::Websocket->value);
});

test('jwt is configured correctly for server subuser', function () {
    $permissions = [Permission::ACTION_WEBSOCKET_CONNECT, Permission::ACTION_CONTROL_CONSOLE];

    /** @var \Pterodactyl\Models\User $user */
    /** @var \Pterodactyl\Models\Server $server */
    [$user, $server] = $this->generateTestAccount($permissions);

    $response = $this->actingAs($user)
        ->withoutExceptionHandling()
        ->getJson("/api/client/servers/$server->uuid/websocket")
        ->assertOk()
        ->assertJsonStructure(['data' => ['token', 'socket']]);

    $config = Configuration::forSymmetricSigner(new Sha256(), $key = InMemory::plainText($server->node->getDecryptedKey()));
    $config = $config->withValidationConstraints(new SignedWith(new Sha256(), $key));

    /** @var \Lcobucci\JWT\Token\Plain $token */
    $token = $config->parser()->parse($response->json('data.token'));

    expect($config->validator()->validate($token, ...$config->validationConstraints()))->toBeTrue()
        ->and($token->claims()->get('permissions'))->toBe($permissions)
        ->and($token->claims()->get('scope'))->toBe(JwtScope::Websocket->value);
});
