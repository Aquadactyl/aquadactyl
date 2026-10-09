<?php

use Illuminate\Support\Str;
use Pterodactyl\Models\User;
use Illuminate\Http\Response;
use Pterodactyl\Models\Subuser;
use Pterodactyl\Models\Permission;
use Illuminate\Foundation\Testing\WithFaker;

uses(WithFaker::class);

test('subuser can be created', function (array $permissions) {
    [$user, $server] = $this->generateTestAccount($permissions);

    $response = $this->actingAs($user)->postJson($this->link($server) . '/users', [
        'email' => $email = $this->faker->email,
        'permissions' => [
            Permission::ACTION_USER_CREATE,
        ],
    ]);

    $response->assertOk();

    /** @var User $subuser */
    $subuser = User::query()->where('email', $email)->firstOrFail();

    $response->assertJsonPath('object', Subuser::RESOURCE_NAME);
    $response->assertJsonPath('attributes.uuid', $subuser->uuid);
    $response->assertJsonPath('attributes.permissions', [
        Permission::ACTION_USER_CREATE,
        Permission::ACTION_WEBSOCKET_CONNECT,
    ]);

    $expected = $response->json('attributes');
    unset($expected['permissions']);

    $this->assertJsonTransformedWith($expected, $subuser);
})->with([
    [[]],
    [[Permission::ACTION_USER_CREATE]],
]);

test('creating subuser with new email logs user creation', function () {
    [$user, $server] = $this->generateTestAccount();

    $response = $this->actingAs($user)->postJson($this->link($server) . '/users', [
        'email' => $email = $this->faker->email,
        'permissions' => [
            Permission::ACTION_USER_CREATE,
        ],
    ]);

    $response->assertOk();

    /** @var User $subuser */
    $subuser = User::query()->where('email', $email)->firstOrFail();

    $this->assertActivityLogged('user:user.create');
    $this->assertDatabaseHas('activity_logs', [
        'event' => 'user:user.create',
        'actor_type' => $user->getMorphClass(),
        'actor_id' => $user->id,
    ]);
});

test('error is returned if assigning permissions not assigned to self', function () {
    [$user, $server] = $this->generateTestAccount([
        Permission::ACTION_USER_CREATE,
        Permission::ACTION_USER_READ,
        Permission::ACTION_CONTROL_CONSOLE,
    ]);

    $response = $this->actingAs($user)->postJson($this->link($server) . '/users', [
        'email' => $this->faker->email,
        'permissions' => [
            Permission::ACTION_USER_CREATE,
            Permission::ACTION_USER_UPDATE, // This permission is not assigned to the subuser.
        ],
    ]);

    $response->assertForbidden();
    $response->assertJsonPath('errors.0.code', 'HttpForbiddenException');
    $response->assertJsonPath('errors.0.detail', 'Cannot assign permissions to a subuser that your account does not actively possess.');
});

test('subuser with excessively long email cannot be created', function () {
    [$user, $server] = $this->generateTestAccount();

    /*
     * RFCs limit certain parts of an email to certain character limits.
     *
     * A limit of <= 64 for the local, then <= 63 for each domain label.
     * We will stay below the limit to make sure we're within the 191 column limit for emails.
     */
    $local = str_repeat(Str::random(10), 6) . '1234';
    $label = str_repeat(Str::random(10), 6) . '1';

    // Make sure we're within the column limit
    $email = "$local@$label.$label.au";

    expect(strlen($local))->toBe(64)
        ->and(strlen($label))->toBe(61)
        ->and(strlen($email))->toBe(191);

    $response = $this->actingAs($user)->postJson($this->link($server) . '/users', [
        'email' => $email,
        'permissions' => [
            Permission::ACTION_USER_CREATE,
        ],
    ]);

    $response->assertOk();

    // Exceed column limit of 1 >= and <= 191
    $email = "$local@$label.$label.com";

    expect(strlen($email))->toBe(192);

    $response = $this->actingAs($user)->postJson($this->link($server) . '/users', [
        'email' => $email,
        'permissions' => [
            Permission::ACTION_USER_CREATE,
        ],
    ]);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    $response->assertJsonPath('errors.0.detail', 'The email must be between 1 and 191 characters.');
    $response->assertJsonPath('errors.0.meta.source_field', 'email');
});

test('creating subuser with same email as existing user works', function () {
    [$user, $server] = $this->generateTestAccount();

    /** @var User $existing */
    $existing = User::factory()->create(['email' => $this->faker->email]);

    $response = $this->actingAs($user)->postJson($this->link($server) . '/users', [
        'email' => $existing->email,
        'permissions' => [
            Permission::ACTION_USER_CREATE,
        ],
    ]);

    $response->assertOk();
    $response->assertJsonPath('object', Subuser::RESOURCE_NAME);
    $response->assertJsonPath('attributes.uuid', $existing->uuid);
});

test('adding subuser that already is assigned returns error', function () {
    [$user, $server] = $this->generateTestAccount();

    $response = $this->actingAs($user)->postJson($this->link($server) . '/users', [
        'email' => $email = $this->faker->email,
        'permissions' => [
            Permission::ACTION_USER_CREATE,
        ],
    ]);

    $response->assertOk();

    $response = $this->actingAs($user)->postJson($this->link($server) . '/users', [
        'email' => $email,
        'permissions' => [
            Permission::ACTION_USER_CREATE,
        ],
    ]);

    $response->assertStatus(Response::HTTP_BAD_REQUEST);
    $response->assertJsonPath('errors.0.code', 'ServerSubuserExistsException');
    $response->assertJsonPath('errors.0.detail', 'A user with that email address is already assigned as a subuser for this server.');
});
