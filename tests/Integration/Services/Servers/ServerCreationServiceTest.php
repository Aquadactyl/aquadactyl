<?php

use Pterodactyl\Models\Egg;
use GuzzleHttp\Psr7\Request;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Location;
use Pterodactyl\Models\Allocation;
use GuzzleHttp\Exception\BadResponseException;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Models\Objects\DeploymentObject;
use Pterodactyl\Services\Servers\ServerCreationService;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

beforeEach(function () {
    $this->bungeecord = Egg::query()
        ->where('author', 'support@pterodactyl.io')
        ->where('name', 'Bungeecord')
        ->firstOrFail();

    $this->daemonServerRepository = Mockery::mock(DaemonServerRepository::class);
    $this->swap(DaemonServerRepository::class, $this->daemonServerRepository);
});

test('server is created with deployment object', function () {
    /** @var User $user */
    $user = User::factory()->create();

    /** @var Location $location */
    $location = Location::factory()->create();

    /** @var Node $node */
    $node = Node::factory()->create([
        'location_id' => $location->id,
    ]);

    /** @var \Pterodactyl\Models\Allocation[]|\Illuminate\Database\Eloquent\Collection $allocations */
    $allocations = Allocation::factory()->times(5)->create([
        'node_id' => $node->id,
    ]);

    $deployment = (new DeploymentObject())->setDedicated(true)->setLocations([$node->location_id])->setPorts([
        $allocations[0]->port,
    ]);

    $egg = $this->cloneEggAndVariables($this->bungeecord);
    // We want to make sure that the validator service runs as an admin, and not as a regular
    // user when saving variables.
    $egg->variables()->first()->update([
        'user_editable' => false,
    ]);

    $data = [
        'name' => fake()->name(),
        'description' => fake()->sentence(),
        'owner_id' => $user->id,
        'memory' => 256,
        'swap' => 128,
        'disk' => 100,
        'io' => 500,
        'cpu' => 0,
        'startup' => 'java server2.jar',
        'image' => 'java:8',
        'egg_id' => $egg->id,
        'allocation_additional' => [
            $allocations[4]->id,
        ],
        'environment' => [
            'BUNGEE_VERSION' => '123',
            'SERVER_JARFILE' => 'server2.jar',
        ],
        'start_on_completion' => true,
    ];

    $this->daemonServerRepository->expects('setServer->create')->with(true)->andReturnUndefined();

    try {
        app(ServerCreationService::class)->handle(array_merge($data, [
            'environment' => [
                'BUNGEE_VERSION' => '',
                'SERVER_JARFILE' => 'server2.jar',
            ],
        ]), $deployment);

        $this->fail('This execution pathway should not be reached.');
    } catch (ValidationException $exception) {
        expect($exception->errors())->toHaveCount(1)
            ->and($exception->errors())->toHaveKey('environment.BUNGEE_VERSION')
            ->and($exception->errors()['environment.BUNGEE_VERSION'][0])->toBe('The Bungeecord Version variable field is required.');
    }

    $response = app(ServerCreationService::class)->handle($data, $deployment);

    expect($response)->toBeInstanceOf(Server::class)
        ->and($response->uuid)->not->toBeNull()
        ->and($response->identifier)->toStartWith('serv_')
        ->and($response->egg_id)->toBe($egg->id)
        ->and($response->variables)->toHaveCount(2)
        ->and($response->variables[0]->server_value)->toBe('123')
        ->and($response->variables[1]->server_value)->toBe('server2.jar');

    foreach ($data as $key => $value) {
        if (in_array($key, ['allocation_additional', 'environment', 'start_on_completion'])) {
            continue;
        }

        expect($response->{$key})->toBe($value);
    }

    expect($response->allocations)->toHaveCount(2)
        ->and($response->allocations[0]->id)->toBe($response->allocation_id)
        ->and($response->allocations[0]->id)->toBe($allocations[0]->id)
        ->and($response->allocations[1]->id)->toBe($allocations[4]->id)
        ->and($response->isSuspended())->toBeFalse()
        ->and($response->oom_disabled)->toBeTrue()
        ->and($response->database_limit)->toBe(0)
        ->and($response->allocation_limit)->toBe(0)
        ->and($response->backup_limit)->toBe(0);
});

test('error encountered by wings causes server to be deleted', function () {
    /** @var User $user */
    $user = User::factory()->create();

    /** @var Location $location */
    $location = Location::factory()->create();

    /** @var Node $node */
    $node = Node::factory()->create([
        'location_id' => $location->id,
    ]);

    /** @var Allocation $allocation */
    $allocation = Allocation::factory()->create([
        'node_id' => $node->id,
    ]);

    $data = [
        'name' => fake()->name(),
        'description' => fake()->sentence(),
        'owner_id' => $user->id,
        'allocation_id' => $allocation->id,
        'node_id' => $allocation->node_id,
        'memory' => 256,
        'swap' => 128,
        'disk' => 100,
        'io' => 500,
        'cpu' => 0,
        'startup' => 'java server2.jar',
        'image' => 'java:8',
        'egg_id' => $this->bungeecord->id,
        'environment' => [
            'BUNGEE_VERSION' => '123',
            'SERVER_JARFILE' => 'server2.jar',
        ],
    ];

    $this->daemonServerRepository->expects('setServer->create')->andThrows(
        new DaemonConnectionException(
            new BadResponseException('Bad request', new Request('POST', '/create'), new Response(500))
        )
    );

    $this->daemonServerRepository->expects('setServer->delete')->andReturnUndefined();

    expect(fn () => app(ServerCreationService::class)->handle($data))
        ->toThrow(DaemonConnectionException::class);

    $this->assertDatabaseMissing('servers', ['owner_id' => $user->id]);
});
