<?php

use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Nest;
use Pterodactyl\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Helpers\SoftwareVersionService;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set('pterodactyl.auth.2fa_required', 0);
    app('cache')->forever(SoftwareVersionService::VERSION_CACHE_KEY, ['panel' => '1.0.0', 'wings' => '1.0.0']);
    $this->actingAs(User::factory()->create(['root_admin' => true]));
});

test('egg installation scripts can be changed and copied only within their own nest', function () {
    $server = $this->createServerModel();
    $egg = $this->cloneEggAndVariables($server->egg);
    $payload = ['script_install' => 'echo installed', 'script_entry' => 'sh', 'script_container' => 'alpine:latest', 'script_is_privileged' => 0];
    $this->patch('/admin/nests/egg/' . $egg->id . '/scripts', $payload)->assertRedirect();
    expect($egg->fresh()->script_install)->toBe('echo installed')->and($egg->fresh()->script_is_privileged)->toBeFalse();
    $this->patch('/admin/nests/egg/' . $egg->id . '/scripts', array_replace($payload, ['copy_script_from' => $server->egg_id]))->assertRedirect();
    expect($egg->fresh()->copy_script_from)->toBe($server->egg_id);
    $other = $this->cloneEggAndVariables($server->egg);
    $other->forceFill(['nest_id' => Nest::factory()->create()->id])->save();
    $this->withoutExceptionHandling();
    expect(fn () => app(Pterodactyl\Services\Eggs\Scripts\InstallScriptService::class)->handle($egg, array_replace($payload, ['copy_script_from' => $other->id])))->toThrow(Pterodactyl\Exceptions\Service\Egg\InvalidCopyFromException::class);
});

test('egg configuration inheritance cannot cross nests and parents with children cannot be removed', function () {
    $server = $this->createServerModel();
    $egg = $this->cloneEggAndVariables($server->egg);
    $other = $this->cloneEggAndVariables($server->egg);
    $other->forceFill(['nest_id' => Nest::factory()->create()->id])->save();
    expect(fn () => app(Pterodactyl\Services\Eggs\EggUpdateService::class)->handle($egg, ['config_from' => $other->id]))->toThrow(Pterodactyl\Exceptions\Service\Egg\NoParentConfigurationFoundException::class);
    expect(fn () => app(Pterodactyl\Services\Eggs\EggCreationService::class)->handle(['nest_id' => $egg->nest_id, 'config_from' => $other->id]))->toThrow(Pterodactyl\Exceptions\Service\Egg\NoParentConfigurationFoundException::class);
    app(Pterodactyl\Services\Eggs\EggUpdateService::class)->handle($egg, ['config_from' => $server->egg_id]);
    expect($egg->fresh()->config_from)->toBe($server->egg_id);
    expect(fn () => app(Pterodactyl\Services\Eggs\EggDeletionService::class)->handle($server->egg_id))->toThrow(Pterodactyl\Exceptions\Service\HasActiveServersException::class);
    $parent = $this->cloneEggAndVariables($server->egg);
    app(Pterodactyl\Services\Eggs\EggUpdateService::class)->handle($egg, ['config_from' => $parent->id]);
    expect(fn () => app(Pterodactyl\Services\Eggs\EggDeletionService::class)->handle($parent->id))->toThrow(Pterodactyl\Exceptions\Service\Egg\HasChildrenException::class);
});

test('nests and eggs can be created edited and removed without affecting existing eggs', function () {
    $this->post('/admin/nests/new', ['name' => 'Coverage nest', 'description' => 'Testing'])->assertRedirect();
    $nest = Nest::query()->where('name', 'Coverage nest')->firstOrFail();
    $this->patch('/admin/nests/view/' . $nest->id, ['name' => 'Updated nest', 'description' => 'Updated'])->assertRedirect();
    expect($nest->fresh()->name)->toBe('Updated nest');
    $this->get('/admin/nests/egg/new')->assertOk();
    $payload = ['name' => 'Coverage egg', 'nest_id' => $nest->id, 'docker_images' => "Java|ghcr.io/pterodactyl/yolks:java_21\nghcr.io/pterodactyl/yolks:java_17", 'startup' => 'java -jar server.jar', 'config_stop' => 'stop', 'config_startup' => '{}', 'config_logs' => '{}', 'config_files' => '{}'];
    $this->post('/admin/nests/egg/new', $payload)->assertRedirect();
    $egg = Egg::query()->where('name', 'Coverage egg')->firstOrFail();
    expect($egg->docker_images)->toBe(['Java' => 'ghcr.io/pterodactyl/yolks:java_21', 'ghcr.io/pterodactyl/yolks:java_17' => 'ghcr.io/pterodactyl/yolks:java_17']);
    $this->get('/admin/nests/egg/' . $egg->id)->assertOk()->assertSee('Java|ghcr.io/pterodactyl/yolks:java_21');
    $this->patch('/admin/nests/egg/' . $egg->id, array_replace($payload, ['name' => 'Updated egg', 'force_outgoing_ip' => 1]))->assertRedirect();
    expect($egg->fresh()->name)->toBe('Updated egg')->and($egg->fresh()->force_outgoing_ip)->toBeTrue();
    $this->delete('/admin/nests/egg/' . $egg->id)->assertRedirect(route('admin.nests.view', $nest->id));
    $this->assertDatabaseMissing('eggs', ['id' => $egg->id]);
    $this->delete('/admin/nests/view/' . $nest->id)->assertRedirect(route('admin.nests'));
    $this->assertDatabaseMissing('nests', ['id' => $nest->id]);
    expect(Egg::query()->count())->toBeGreaterThan(0);
});

test('egg variables retain defaults edit permissions and validation rules through their lifecycle', function () {
    $egg = $this->cloneEggAndVariables(Egg::query()->firstOrFail());
    $url = '/admin/nests/egg/' . $egg->id . '/variables';
    $payload = ['name' => 'Test variable', 'env_variable' => 'COVERAGE_TEST', 'default_value' => 'default', 'rules' => 'required|string|max:100', 'options' => ['user_viewable', 'user_editable']];
    $this->post($url, $payload)->assertRedirect();
    $variable = $egg->variables()->where('env_variable', 'COVERAGE_TEST')->firstOrFail();
    expect($variable->default_value)->toBe('default')->and($variable->user_editable)->toBeTrue();
    unset($payload['options']);
    $this->patch($url . '/' . $variable->id, array_replace($payload, ['name' => 'Renamed variable', 'default_value' => 'changed']))->assertRedirect();
    expect($variable->fresh()->default_value)->toBe('changed')->and($variable->fresh()->user_editable)->toBeFalse();
    $this->delete($url . '/' . $variable->id)->assertRedirect();
    $this->assertDatabaseMissing('egg_variables', ['id' => $variable->id]);
});

test('egg JSON exports can be imported and update variables without leaving removed values behind', function () {
    $source = Egg::query()->whereHas('variables')->firstOrFail();
    $export = $this->get('/admin/nests/egg/' . $source->id . '/export')->assertOk()->assertHeader('Content-Type', 'application/json');
    $parsed = json_decode($export->getContent(), true, flags: JSON_THROW_ON_ERROR);
    $parsed['name'] = 'Imported coverage egg';
    $this->post('/admin/nests/import', ['import_to_nest' => $source->nest_id, 'import_file' => UploadedFile::fake()->createWithContent('egg.json', json_encode($parsed))])->assertRedirect();
    $egg = Egg::query()->where('name', 'Imported coverage egg')->firstOrFail();
    expect($egg->variables()->count())->toBe(count($parsed['variables']));
    $old = $egg->variables()->firstOrFail();
    $parsed['name'] = 'Updated import';
    $parsed['variables'] = [array_merge($parsed['variables'][0], ['name' => 'Updated value', 'default_value' => 'changed']), array_merge($parsed['variables'][0], ['env_variable' => 'NEW_COVERAGE_VALUE', 'name' => 'New value'])];
    $this->put('/admin/nests/egg/' . $egg->id, ['import_file' => UploadedFile::fake()->createWithContent('egg.json', json_encode($parsed))])->assertRedirect();
    expect($egg->fresh()->name)->toBe('Updated import')->and($egg->variables()->count())->toBe(2);
    expect($old->fresh()->default_value)->toBe('changed');
    expect($egg->variables()->where('env_variable', 'NEW_COVERAGE_VALUE')->exists())->toBeTrue();
    $parsed['variables'] = [];
    $this->put('/admin/nests/egg/' . $egg->id, ['import_file' => UploadedFile::fake()->createWithContent('egg.json', json_encode($parsed))])->assertRedirect();
    expect($egg->variables()->count())->toBe(0);
});

test('egg JSON imports require a real destination nest and JSON upload', function (array $payload) {
    $this->postJson('/admin/nests/import', $payload)->assertUnprocessable();
})->with([[[]], [['import_to_nest' => 2147483647]]]);
