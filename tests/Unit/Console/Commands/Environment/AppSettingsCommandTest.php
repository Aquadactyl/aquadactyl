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

test('environment setup rejects invalid author addresses without writing configuration', function () {
    config()->set('hashids.salt', null);
    $command = m::mock(AppSettingsCommand::class . '[writeToEnvironment]', [m::mock(Kernel::class)]);
    $command->setLaravel($this->app);
    $command->shouldNotReceive('writeToEnvironment');
    $tester = new CommandTester($command);
    expect($tester->execute(['--author' => 'not-an-email']))->toBe(1)->and($tester->getDisplay())->toContain('invalid');
});

test('interactive environment setup uses existing defaults and can keep configured Redis credentials', function () {
    config()->set(['hashids.salt' => 'existing', 'database.redis.default.password' => 'existing-redis-secret']);
    $kernel = m::mock(Kernel::class);
    $kernel->shouldReceive('output')->andReturn('');
    $command = m::mock(AppSettingsCommand::class . '[ask,anticipate,choice,confirm,writeToEnvironment]', [$kernel]);
    $command->setLaravel($this->app);
    $command->shouldReceive('ask')->with('Egg Author Email', m::any())->andReturn('author@example.test');
    $command->shouldReceive('ask')->with('Application URL', m::any())->andReturn('http://panel.example.test');
    $command->shouldReceive('ask')->with('Redis Host', m::any())->andReturn('redis');
    $command->shouldReceive('ask')->with('Redis Port', m::any())->andReturn('6379');
    $command->shouldReceive('anticipate')->with('Application Timezone', m::any(), m::any())->andReturn('UTC');
    $command->shouldReceive('choice')->with('Cache Driver', m::any(), m::any())->andReturn('redis');
    $command->shouldReceive('choice')->with('Session Driver', m::any(), m::any())->andReturn('redis');
    $command->shouldReceive('choice')->with('Queue Driver', m::any(), m::any())->andReturn('redis');
    $command->shouldReceive('confirm')->with('Enable UI based settings editor?', true)->andReturnFalse();
    $command->shouldReceive('confirm')->with('It seems a password is already defined for Redis, would you like to change it?')->andReturnFalse();
    $command->shouldReceive('writeToEnvironment')->once()->with(m::on(fn ($values) => $values['REDIS_PASSWORD'] === 'existing-redis-secret' && $values['REDIS_HOST'] === 'redis' && $values['APP_ENVIRONMENT_ONLY'] === 'true'));
    expect((new CommandTester($command))->execute([]))->toBe(0);
});

test('environment setup configures Redis with an optional empty password and generates a new salt', function () {
    config()->set('database.redis.default.password', null);
    $kernel = m::mock(Kernel::class);
    $kernel->shouldReceive('output')->andReturn('');
    $command = m::mock(AppSettingsCommand::class . '[writeToEnvironment]', [$kernel]);
    $command->setLaravel($this->app);
    $command->shouldReceive('writeToEnvironment')->once()->with(m::on(fn ($values) => strlen($values['HASHIDS_SALT']) === 20 && $values['REDIS_PASSWORD'] === 'null' && $values['REDIS_PORT'] === '6379'));
    expect((new CommandTester($command))->execute(['--new-salt' => true, '--author' => 'author@example.test', '--url' => 'http://panel.example.test', '--timezone' => 'UTC', '--cache' => 'redis', '--session' => 'file', '--queue' => 'sync', '--settings-ui' => 'true', '--redis-host' => 'redis', '--redis-port' => '6379'], ['interactive' => false]))->toBe(0);
});
