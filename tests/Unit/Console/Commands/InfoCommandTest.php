<?php

use Pterodactyl\Console\Commands\InfoCommand;
use Symfony\Component\Console\Tester\CommandTester;
use Pterodactyl\Services\Helpers\SoftwareVersionService;

test('panel information displays configuration without disclosing transport credentials', function (string $mailer, bool $current) {
    config()->set('mail.default', $mailer);
    config()->set('mail.mailers.smtp.password', 'private-mail-password');
    config()->set('database.connections.mysql.password', 'private-database-password');
    config()->set('app.env', $current ? 'production' : 'testing');
    config()->set('app.debug', !$current);
    $versions = Mockery::mock(SoftwareVersionService::class);
    $versions->shouldReceive('getPanel')->andReturn('1.0.0');
    $versions->shouldReceive('isLatestPanel')->andReturn($current);
    $command = new InfoCommand($this->app['config'], $versions);
    $command->setLaravel($this->app);
    $tester = new CommandTester($command);
    $tester->execute([]);
    expect($tester->getDisplay())->toContain('Version Information', 'Application Configuration', 'Database Configuration', 'Email Configuration', $mailer)
        ->not->toContain('private-mail-password', 'private-database-password');
})->with([['smtp', true], ['array', false], ['unknown', false]]);
