<?php

use Mockery as m;
use Illuminate\Contracts\Console\Kernel;
use Symfony\Component\Console\Tester\CommandTester;
use Pterodactyl\Console\Commands\Environment\AppSettingsCommand;

test('environment setup configures the panel without telemetry prompts or settings', function () {
    $kernel = m::mock(Kernel::class);
    $kernel->shouldReceive('output')->once()->andReturn('');
    $command = m::mock(AppSettingsCommand::class . '[confirm,writeToEnvironment]', [$kernel]);
    $command->setLaravel($this->app);
    $command->shouldReceive('confirm')->never();
    $written = [];
    $command->shouldReceive('writeToEnvironment')->once()->andReturnUsing(function (array $values) use (&$written) {
        $written = $values;
    });

    $tester = new CommandTester($command);
    $status = $tester->execute([
        '--author' => 'author@example.invalid', '--url' => 'https://panel.example.invalid',
        '--timezone' => 'UTC', '--cache' => 'file', '--session' => 'file',
        '--queue' => 'sync', '--settings-ui' => 'false',
    ], ['interactive' => false]);

    expect($status)->toBe(0)
        ->and($written)->toMatchArray([
            'APP_SERVICE_AUTHOR' => 'author@example.invalid',
            'APP_URL' => 'https://panel.example.invalid', 'APP_TIMEZONE' => 'UTC',
            'CACHE_DRIVER' => 'file', 'SESSION_DRIVER' => 'file', 'QUEUE_CONNECTION' => 'sync',
            'APP_ENVIRONMENT_ONLY' => 'true', 'SESSION_SECURE_COOKIE' => 'true',
        ])
        ->and(array_keys($written))->not->toContain('PTERODACTYL_TELEMETRY_ENABLED')
        ->and($tester->getDisplay())->not->toContain('telemetry');
});
