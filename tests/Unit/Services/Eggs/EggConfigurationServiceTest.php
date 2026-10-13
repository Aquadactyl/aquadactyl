<?php

use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Server;
use Pterodactyl\Services\Eggs\EggConfigurationService;
use Pterodactyl\Services\Servers\ServerConfigurationStructureService;

test('egg configuration preserves parsers, replaces server values and retains daemon placeholders', function () {
    $find = [
        'name' => '{{server.name}}',
        'secret' => '{{env.SECRET}}',
        'missing' => '{{server.unknown}}',
        'other' => '{{extension.value}}',
        'interface' => '{{config.docker.interface}}',
        'memory' => '{{env.SERVER_MEMORY}}',
        'ip' => '{{server.build.env.SERVER_IP}}',
        'port' => '{{env.SERVER_PORT}}',
        'conditional' => ['old-value' => '{{env.SECRET}}'],
        'nested' => ['deeper' => ['key' => '{{server.name}}']],
        'number' => 42,
    ];
    $egg = (new Egg())->forceFill([
        'config_files' => json_encode(['server.properties' => ['parser' => 'properties', 'find' => $find], 'invalid' => false, 'missing-find' => ['parser' => 'file']]),
        'config_startup' => '{"done":"Done","strip_ansi":true}',
        'config_stop' => '^sigterm',
    ]);
    $server = (new Server())->setRelation('egg', $egg);
    $structure = Mockery::mock(ServerConfigurationStructureService::class);
    $structure->shouldReceive('handle')->once()->with($server, [], true)->andReturn(['name' => 'My Server', 'build' => ['env' => ['SECRET' => 'value']]]);
    $result = (new EggConfigurationService($structure))->handle($server);
    expect($result['startup'])->toBe(['done' => ['Done'], 'user_interaction' => [], 'strip_ansi' => true])
        ->and($result['stop'])->toBe(['type' => 'signal', 'value' => 'SIGTERM'])
        ->and($result['configs'])->toHaveCount(1)
        ->and($result['configs'][0]['file'])->toBe('server.properties')
        ->and($result['configs'][0]['parser'])->toBe('properties')
        ->and($result['configs'][0])->not->toHaveKey('find');
    $replacements = collect($result['configs'][0]['replace'])->keyBy('match');
    expect($replacements['name']['replace_with'])->toBe('My Server')
        ->and($replacements['secret']['replace_with'])->toBe('value')
        ->and($replacements['missing']['replace_with'])->toBe('')
        ->and($replacements['other']['replace_with'])->toBe('{{extension.value}}')
        ->and($replacements['interface']['replace_with'])->toBe('{{config.docker.network.interface}}')
        ->and($replacements['memory']['replace_with'])->toBe('{{server.build.memory}}')
        ->and($replacements['ip']['replace_with'])->toBe('{{server.build.default.ip}}')
        ->and($replacements['port']['replace_with'])->toBe('{{server.build.default.port}}')
        ->and($replacements['conditional'])->toBe(['match' => 'conditional', 'if_value' => 'old-value', 'replace_with' => 'value'])
        ->and($replacements['number']['replace_with'])->toBe(42);
});

test('egg startup arrays and command stops retain their original values', function () {
    $egg = (new Egg())->forceFill(['config_files' => '{}', 'config_startup' => '{"done":["Ready","Done"]}', 'config_stop' => 'stop']);
    $server = (new Server())->setRelation('egg', $egg);
    $structure = Mockery::mock(ServerConfigurationStructureService::class);
    $structure->shouldReceive('handle')->andReturn([]);
    $result = (new EggConfigurationService($structure))->handle($server);
    expect($result)->toBe([
        'startup' => ['done' => ['Ready', 'Done'], 'user_interaction' => [], 'strip_ansi' => false],
        'stop' => ['type' => 'command', 'value' => 'stop'],
        'configs' => [],
    ]);
});
