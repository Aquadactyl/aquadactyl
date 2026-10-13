<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\DatabaseManager;
use Illuminate\Database\ConnectionInterface;
use Symfony\Component\Console\Tester\CommandTester;
use Pterodactyl\Console\Commands\Environment\DatabaseSettingsCommand;

test('database configuration verifies a connection before saving credentials', function (bool $interactive) {
    config()->set('database.connections.mysql.password', $interactive ? 'saved-secret' : null);
    $connection = Mockery::mock(ConnectionInterface::class);
    $connection->shouldReceive('getPdo')->once()->andReturn(Mockery::mock(PDO::class));
    $database = Mockery::mock(DatabaseManager::class);
    $database->shouldReceive('connection')->once()->with('_pterodactyl_command_test')->andReturn($connection);
    $kernel = Mockery::mock(Kernel::class);
    $kernel->shouldReceive('output')->andReturn('Configured');
    $command = Mockery::mock(DatabaseSettingsCommand::class . '[confirm,ask,secret,writeToEnvironment]', [$database, $kernel]);
    $command->setLaravel($this->app);
    $command->shouldReceive('confirm')->andReturn(false);
    $command->shouldReceive('ask')->andReturnUsing(fn ($question, $default) => $default);
    $command->shouldReceive('secret')->andReturn('new-secret');
    $written = [];
    $command->shouldReceive('writeToEnvironment')->once()->andReturnUsing(function ($values) use (&$written) { $written = $values; });
    $tester = new CommandTester($command);
    $options = $interactive ? [] : ['--host' => 'database.example.test', '--port' => '3307', '--database' => 'testing', '--username' => 'panel', '--password' => 'new-secret'];
    expect($tester->execute($options, ['interactive' => $interactive]))->toBe(0)
        ->and($written['DB_PASSWORD'])->toBe($interactive ? 'saved-secret' : 'new-secret')
        ->and(config('database.connections._pterodactyl_command_test.password'))->toBe($written['DB_PASSWORD']);
})->with([false, true]);

test('failed database credentials are never saved and can be retried', function (bool $retry) {
    config()->set('database.connections.mysql.password', null);
    $connection = Mockery::mock(ConnectionInterface::class);
    $connection->shouldReceive('getPdo')->once()->andThrow(new PDOException('connection refused'));
    if ($retry) {
        $connection->shouldReceive('getPdo')->once()->andReturn(Mockery::mock(PDO::class));
    }
    $database = Mockery::mock(DatabaseManager::class);
    $database->shouldReceive('connection')->andReturn($connection);
    if ($retry) {
        $database->shouldReceive('disconnect')->once()->with('_pterodactyl_command_test');
    }
    $kernel = Mockery::mock(Kernel::class);
    $kernel->shouldReceive('output')->andReturn('');
    $command = Mockery::mock(DatabaseSettingsCommand::class . '[confirm,writeToEnvironment]', [$database, $kernel]);
    $command->setLaravel($this->app);
    $command->shouldReceive('confirm')->once()->andReturn($retry);
    $command->shouldReceive('writeToEnvironment')->times($retry ? 1 : 0);
    $tester = new CommandTester($command);
    expect($tester->execute(['--host' => 'database.example.test', '--port' => '3306', '--database' => 'testing', '--username' => 'panel', '--password' => 'test-secret'], ['interactive' => false]))->toBe($retry ? 0 : 1)
        ->and($tester->getDisplay())->toContain('credentials have NOT been saved');
})->with([false, true]);
