<?php

use Pterodactyl\Models\Egg;
use Pterodactyl\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Services\Servers\VariableValidatorService;

beforeEach(function () {
    $this->egg = Egg::query()
        ->where('author', 'support@pterodactyl.io')
        ->where('name', 'Bungeecord')
        ->firstOrFail();
});

test('environment variables can be validated', function () {
    $egg = $this->cloneEggAndVariables($this->egg);

    try {
        app(VariableValidatorService::class)->handle($egg->id, [
            'BUNGEE_VERSION' => '1.2.3',
        ]);

        $this->fail('This statement should not be reached.');
    } catch (ValidationException $exception) {
        $errors = $exception->errors();

        expect($errors)->toHaveCount(2)
            ->and($errors)->toHaveKey('environment.BUNGEE_VERSION')
            ->and($errors)->toHaveKey('environment.SERVER_JARFILE')
            ->and($errors['environment.BUNGEE_VERSION'][0])->toBe('The Bungeecord Version variable may only contain letters and numbers.')
            ->and($errors['environment.SERVER_JARFILE'][0])->toBe('The Bungeecord Jar File variable field is required.');
    }

    $response = app(VariableValidatorService::class)->handle($egg->id, [
        'BUNGEE_VERSION' => '1234',
        'SERVER_JARFILE' => 'server.jar',
    ]);

    expect($response)->toBeInstanceOf(Collection::class)
        ->and($response)->toHaveCount(2)
        ->and($response->get(0)->key)->toBe('BUNGEE_VERSION')
        ->and($response->get(0)->value)->toBe('1234')
        ->and($response->get(1)->key)->toBe('SERVER_JARFILE')
        ->and($response->get(1)->value)->toBe('server.jar');
});

test('normal user cannot validate non user editable variables', function () {
    $egg = $this->cloneEggAndVariables($this->egg);
    $egg->variables()->first()->update([
        'user_editable' => false,
    ]);

    $response = app(VariableValidatorService::class)->handle($egg->id, [
        // This is an invalid value, but it shouldn't cause any issues since it should be skipped.
        'BUNGEE_VERSION' => '1.2.3',
        'SERVER_JARFILE' => 'server.jar',
    ]);

    expect($response)->toBeInstanceOf(Collection::class)
        ->and($response)->toHaveCount(1)
        ->and($response->get(0)->key)->toBe('SERVER_JARFILE')
        ->and($response->get(0)->value)->toBe('server.jar');
});

test('environment variables can be updated as admin', function () {
    $egg = $this->cloneEggAndVariables($this->egg);
    $egg->variables()->first()->update([
        'user_editable' => false,
    ]);

    try {
        app(VariableValidatorService::class)->setUserLevel(User::USER_LEVEL_ADMIN)->handle($egg->id, [
            'BUNGEE_VERSION' => '1.2.3',
            'SERVER_JARFILE' => 'server.jar',
        ]);

        $this->fail('This statement should not be reached.');
    } catch (ValidationException $exception) {
        expect($exception->errors())->toHaveCount(1)
            ->and($exception->errors())->toHaveKey('environment.BUNGEE_VERSION');
    }

    $response = app(VariableValidatorService::class)->setUserLevel(User::USER_LEVEL_ADMIN)->handle($egg->id, [
        'BUNGEE_VERSION' => '123',
        'SERVER_JARFILE' => 'server.jar',
    ]);

    expect($response)->toBeInstanceOf(Collection::class)
        ->and($response)->toHaveCount(2)
        ->and($response->get(0)->key)->toBe('BUNGEE_VERSION')
        ->and($response->get(0)->value)->toBe('123')
        ->and($response->get(1)->key)->toBe('SERVER_JARFILE')
        ->and($response->get(1)->value)->toBe('server.jar');
});

test('nullable environment variables can be used correctly', function () {
    $egg = $this->cloneEggAndVariables($this->egg);
    $egg->variables()->where('env_variable', '!=', 'BUNGEE_VERSION')->delete();

    $egg->variables()->update(['rules' => 'nullable|string']);

    $response = app(VariableValidatorService::class)->handle($egg->id, []);
    expect($response)->toHaveCount(1)
        ->and($response->get(0)->value)->toBeNull();

    $response = app(VariableValidatorService::class)->handle($egg->id, ['BUNGEE_VERSION' => null]);
    expect($response)->toHaveCount(1)
        ->and($response->get(0)->value)->toBeNull();

    $response = app(VariableValidatorService::class)->handle($egg->id, ['BUNGEE_VERSION' => '']);
    expect($response)->toHaveCount(1)
        ->and($response->get(0)->value)->toBe('');
});
