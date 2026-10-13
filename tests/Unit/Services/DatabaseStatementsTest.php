<?php

use Illuminate\Database\DatabaseManager;
use Illuminate\Database\ConnectionInterface;
use Pterodactyl\Repositories\Eloquent\DatabaseRepository;

test('database DDL executes on the selected remote connection and reports the actual statement result', function () {
    $remote = Mockery::mock(ConnectionInterface::class);
    $manager = Mockery::mock(DatabaseManager::class);
    $manager->shouldReceive('connection')->with('remote')->andReturn($remote);
    $repository = new DatabaseRepository($this->app, $manager);
    expect($repository->getConnection())->toBe('dynamic');
    $repository->setConnection('remote');
    $remote->shouldReceive('statement')->once()->with('CREATE DATABASE IF NOT EXISTS `s1_data`')->andReturnTrue();
    $remote->shouldReceive('statement')->once()->with("CREATE USER `u1`@`%` IDENTIFIED BY 'password'")->andReturnTrue();
    $remote->shouldReceive('statement')->once()->with("CREATE USER `u2`@`127.0.0.1` IDENTIFIED BY 'password' WITH MAX_USER_CONNECTIONS 10")->andReturnTrue();
    $remote->shouldReceive('statement')->once()->with(Mockery::on(fn ($sql) => str_contains($sql, 'GRANT') && str_contains($sql, '`s1_data`.*') && str_contains($sql, '`u1`@`%`')))->andReturnTrue();
    $remote->shouldReceive('statement')->once()->with('FLUSH PRIVILEGES')->andReturnTrue();
    $remote->shouldReceive('statement')->once()->with('DROP DATABASE IF EXISTS `s1_data`')->andReturnFalse();
    $remote->shouldReceive('statement')->once()->with('DROP USER IF EXISTS `u1`@`%`')->andReturnTrue();
    expect($repository->createDatabase('s1_data'))->toBeTrue()->and($repository->createUser('u1', '%', 'password', null))->toBeTrue()
        ->and($repository->createUser('u2', '127.0.0.1', 'password', 10))->toBeTrue()->and($repository->assignUserToDatabase('s1_data', 'u1', '%'))->toBeTrue()
        ->and($repository->flush())->toBeTrue()->and($repository->dropDatabase('s1_data'))->toBeFalse()->and($repository->dropUser('u1', '%'))->toBeTrue();
});
