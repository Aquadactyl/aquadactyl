<?php

use Pterodactyl\Models\EggVariable;
use Illuminate\Contracts\Validation\Factory;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Services\Eggs\Variables\VariableUpdateService;
use Pterodactyl\Services\Eggs\Variables\VariableCreationService;
use Pterodactyl\Contracts\Repository\EggVariableRepositoryInterface;
use Pterodactyl\Exceptions\Service\Egg\Variable\BadValidationRuleException;
use Pterodactyl\Exceptions\Service\Egg\Variable\ReservedVariableNameException;

beforeEach(function () {
    $this->repository = Mockery::mock(EggVariableRepositoryInterface::class);
    $this->variable = (new EggVariable())->forceFill(['id' => 7, 'egg_id' => 3]);
    $this->creation = new VariableCreationService($this->repository, app(Factory::class));
    $this->update = new VariableUpdateService($this->repository, app(Factory::class));
});

test('egg variable services reject protected names case insensitively before persisting', function (string $name) {
    $this->repository->shouldNotReceive('create');
    $this->repository->shouldNotReceive('update');
    expect(fn () => $this->creation->handle(3, ['env_variable' => strtolower($name)]))->toThrow(ReservedVariableNameException::class)
        ->and(fn () => $this->update->handle($this->variable, ['env_variable' => strtolower($name)]))->toThrow(ReservedVariableNameException::class);
})->with(explode(',', EggVariable::RESERVED_ENV_NAMES));

test('egg variable creation preserves values and explicitly sets visibility and editing options', function (array $options) {
    $values = ['name' => 'Port', 'description' => 'Public service port', 'env_variable' => 'CUSTOM_PORT', 'default_value' => '8080', 'rules' => 'required|integer'];
    $this->repository->shouldReceive('create')->once()->with($values + ['egg_id' => 3, 'user_viewable' => in_array('user_viewable', $options), 'user_editable' => in_array('user_editable', $options)])->andReturn($this->variable);
    expect($this->creation->handle(3, $values + ['options' => $options]))->toBe($this->variable);
})->with([[[]], [['user_viewable']], [['user_viewable', 'user_editable']]]);

test('egg variable creation applies empty defaults when no optional values are supplied', function () {
    $this->repository->shouldReceive('create')->once()->with([
        'egg_id' => 3, 'name' => '', 'description' => '', 'env_variable' => '', 'default_value' => '',
        'user_viewable' => false, 'user_editable' => false, 'rules' => '',
    ])->andReturn($this->variable);
    expect($this->creation->handle(3, []))->toBe($this->variable);
});

test('egg variable updates check uniqueness within the same egg while excluding the edited variable', function (int $duplicates) {
    $this->repository->shouldReceive('setColumns')->once()->with('id')->andReturnSelf();
    $this->repository->shouldReceive('findCountWhere')->once()->with([
        ['env_variable', '=', 'CUSTOM_PORT'], ['egg_id', '=', 3], ['id', '!=', 7],
    ])->andReturn($duplicates);
    if ($duplicates) {
        $this->repository->shouldNotReceive('update');
        expect(fn () => $this->update->handle($this->variable, ['env_variable' => 'CUSTOM_PORT']))->toThrow(DisplayException::class);

        return;
    }
    $this->repository->shouldReceive('withoutFreshModel')->once()->andReturnSelf();
    $this->repository->shouldReceive('update')->once()->with(7, [
        'name' => '', 'description' => '', 'env_variable' => 'CUSTOM_PORT', 'default_value' => '',
        'user_viewable' => false, 'user_editable' => false, 'rules' => '',
    ])->andReturn(true);
    expect($this->update->handle($this->variable, ['env_variable' => 'CUSTOM_PORT']))->toBeTrue();
})->with([0, 1]);

test('egg variable updates accept Laravel rule arrays and Blueprint double-semicolon syntax', function (array|string $rules) {
    $this->repository->shouldReceive('withoutFreshModel')->once()->andReturnSelf();
    $this->repository->shouldReceive('update')->once()->with(7, [
        'name' => 'Port', 'description' => '', 'env_variable' => '', 'default_value' => '',
        'user_viewable' => true, 'user_editable' => true, 'rules' => $rules,
    ])->andReturn(true);
    expect($this->update->handle($this->variable, ['name' => 'Port', 'rules' => $rules, 'options' => ['user_viewable', 'user_editable']]))->toBeTrue();
})->with([['required|integer'], ['required;;integer'], [['required', 'integer']]]);

test('unknown validation rules are rejected before creating or updating a variable', function () {
    $this->repository->shouldNotReceive('create');
    $this->repository->shouldNotReceive('update');
    expect(fn () => $this->creation->handle(3, ['rules' => 'unknown_test_rule']))->toThrow(BadValidationRuleException::class)
        ->and(fn () => $this->update->handle($this->variable, ['rules' => 'unknown_test_rule']))->toThrow(BadValidationRuleException::class);
});

test('egg validation identifies legacy validator errors and preserves unrelated validator failures', function (bool $legacy) {
    $error = new BadMethodCallException($legacy ? 'Method [validateCustomRule] does not exist.' : 'A validation extension failed.');
    $validator = Mockery::mock(Illuminate\Contracts\Validation\Validator::class);
    $validator->shouldReceive('fails')->once()->andThrow($error);
    $factory = Mockery::mock(Factory::class);
    $factory->shouldReceive('make')->once()->andReturn($validator);
    $service = new VariableCreationService($this->repository, $factory);
    $this->repository->shouldNotReceive('create');
    expect(fn () => $service->handle(3, ['rules' => 'custom_rule']))->toThrow($legacy ? BadValidationRuleException::class : $error);
})->with([true, false]);
