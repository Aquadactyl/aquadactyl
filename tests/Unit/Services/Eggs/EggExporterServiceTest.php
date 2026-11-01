<?php

use Pterodactyl\Models\Egg;
use Pterodactyl\Models\EggVariable;
use Pterodactyl\Services\Eggs\Sharing\EggExporterService;
use Pterodactyl\Contracts\Repository\EggRepositoryInterface;

test('exported eggs retain installation settings while removing database identifiers', function () {
    $egg = (new Egg())->forceFill([
        'name' => 'Test egg', 'author' => 'author@example.test', 'description' => 'A fixture',
        'features' => ['eula'], 'docker_images' => ['Java' => 'ghcr.io/pterodactyl/yolks:java_25'],
        'file_denylist' => ['private.key', ''], 'startup' => 'java -jar server.jar',
        'config_files' => '{}', 'config_startup' => '{"done":"Done"}', 'config_logs' => '{}', 'config_stop' => 'stop',
        'script_install' => 'echo installed', 'script_container' => 'alpine', 'script_entry' => 'sh',
    ]);
    $egg->setRelation('variables', collect([(new EggVariable())->forceFill([
        'id' => 100, 'egg_id' => 200, 'name' => 'Jar', 'env_variable' => 'SERVER_JAR',
        'default_value' => 'server.jar', 'rules' => 'required|string', 'user_viewable' => true, 'user_editable' => true,
    ])]));
    $repository = Mockery::mock(EggRepositoryInterface::class);
    $repository->shouldReceive('getWithExportAttributes')->once()->with(7)->andReturn($egg);
    $json = (new EggExporterService($repository))->handle(7);
    $data = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
    expect($data['name'])->toBe('Test egg')
        ->and($data['meta']['version'])->toBe(Egg::EXPORT_VERSION)
        ->and($data['file_denylist'])->toBe(['private.key'])
        ->and($data['scripts']['installation'])->toBe(['script' => 'echo installed', 'container' => 'alpine', 'entrypoint' => 'sh'])
        ->and($data['variables'][0]['env_variable'])->toBe('SERVER_JAR')
        ->and($data['variables'][0]['field_type'])->toBe('text')
        ->and($data['variables'][0])->not->toHaveKeys(['id', 'egg_id', 'created_at', 'updated_at']);
});
