<?php

use Pterodactyl\Models\Nest;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\ServerVariable;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Pterodactyl\Services\Servers\StartupModificationService;

test('non-admin can modify server variables', function () {
    $server = $this->createServerModel();

    try {
        app(StartupModificationService::class)->handle($server, [
            'egg_id' => $server->egg_id + 1,
            'environment' => [
                'BUNGEE_VERSION' => '$$',
                'SERVER_JARFILE' => 'server.jar',
            ],
        ]);

        $this->fail('This assertion should not be called.');
    } catch (\Exception $exception) {
        expect($exception)->toBeInstanceOf(ValidationException::class);

        /** @var ValidationException $exception */
        $errors = $exception->validator->errors()->toArray();

        expect($errors)->toHaveCount(1)
            ->and($errors)->toHaveKey('environment.BUNGEE_VERSION')
            ->and($errors['environment.BUNGEE_VERSION'])->toHaveCount(1)
            ->and($errors['environment.BUNGEE_VERSION'][0])->toBe('The Bungeecord Version variable may only contain letters and numbers.');
    }

    ServerVariable::query()->where('variable_id', $server->variables[1]->id)->delete();

    $result = app(StartupModificationService::class)
        ->handle($server, [
            'egg_id' => $server->egg_id + 1,
            'startup' => 'random gibberish',
            'environment' => [
                'BUNGEE_VERSION' => '1234',
                'SERVER_JARFILE' => 'test.jar',
            ],
        ]);

    expect($result)->toBeInstanceOf(Server::class)
        ->and($result->variables)->toHaveCount(2)
        ->and($result->startup)->toBe($server->startup)
        ->and($result->variables[0]->server_value)->toBe('1234')
        ->and($result->variables[1]->server_value)->toBe('test.jar');
});

test('server is properly modified as admin user', function () {
    /** @var \Pterodactyl\Models\Egg $nextEgg */
    $nextEgg = Nest::query()->findOrFail(2)->eggs()->firstOrFail();

    $server = $this->createServerModel(['egg_id' => 1]);

    expect($server->egg_id)->not->toBe($nextEgg->id)
        ->and($server->nest_id)->not->toBe($nextEgg->nest_id);

    $response = app(StartupModificationService::class)
        ->setUserLevel(User::USER_LEVEL_ADMIN)
        ->handle($server, [
            'egg_id' => $nextEgg->id,
            'startup' => 'sample startup',
            'skip_scripts' => true,
            'docker_image' => 'docker/hodor',
        ]);

    expect($response)->toBeInstanceOf(Server::class)
        ->and($response->egg_id)->toBe($nextEgg->id)
        ->and($response->nest_id)->toBe($nextEgg->nest_id)
        ->and($response->startup)->toBe('sample startup')
        ->and($response->image)->toBe('docker/hodor')
        ->and($response->skip_scripts)->toBeTrue()
        // Make sure we don't revert back to a lurking bug that causes servers to get marked
        // as not installed when you modify the startup...
        ->and($response->isInstalled())->toBeTrue();
});

test('environment variables can be updated by admin', function () {
    $server = $this->createServerModel();
    $server->loadMissing(['egg', 'variables']);

    $clone = $this->cloneEggAndVariables($server->egg);
    // This makes the BUNGEE_VERSION variable not user editable.
    $clone->variables()->first()->update([
        'user_editable' => false,
    ]);

    $server->fill(['egg_id' => $clone->id])->saveOrFail();
    $server->refresh();

    ServerVariable::query()->updateOrCreate([
        'server_id' => $server->id,
        'variable_id' => $server->variables[0]->id,
    ], ['variable_value' => 'EXIST']);

    $response = app(StartupModificationService::class)->handle($server, [
        'environment' => [
            'BUNGEE_VERSION' => '1234',
            'SERVER_JARFILE' => 'test.jar',
        ],
    ]);

    expect($response->variables)->toHaveCount(2)
        ->and($response->variables[0]->server_value)->toBe('EXIST')
        ->and($response->variables[1]->server_value)->toBe('test.jar');

    $response = app(StartupModificationService::class)
        ->setUserLevel(User::USER_LEVEL_ADMIN)
        ->handle($server, [
            'environment' => [
                'BUNGEE_VERSION' => '1234',
                'SERVER_JARFILE' => 'test.jar',
            ],
        ]);

    expect($response->variables)->toHaveCount(2)
        ->and($response->variables[0]->server_value)->toBe('1234')
        ->and($response->variables[1]->server_value)->toBe('test.jar');
});

test('invalid egg id triggers exception', function () {
    $server = $this->createServerModel();

    $this->expectException(ModelNotFoundException::class);

    app(StartupModificationService::class)
        ->setUserLevel(User::USER_LEVEL_ADMIN)
        ->handle($server, ['egg_id' => 123456789]);
});
