<?php

use Symfony\Component\Console\Tester\CommandTester;
use Pterodactyl\Console\Commands\Environment\EmailSettingsCommand;

test('mail configuration writes the selected transport and its required settings', function (string $driver) {
    $command = Mockery::mock(EmailSettingsCommand::class . '[writeToEnvironment]', [$this->app['config']]);
    $command->setLaravel($this->app);
    $written = [];
    $command->shouldReceive('writeToEnvironment')->once()->andReturnUsing(function ($values) use (&$written) { $written = $values; });
    $tester = new CommandTester($command);
    $tester->execute(['--driver' => $driver, '--email' => 'panel@example.test', '--from' => 'Aquadactyl', '--host' => 'mail.example.test', '--port' => '587', '--username' => 'test-user', '--password' => 'test-password', '--encryption' => 'tls', '--endpoint' => 'api.eu.mailgun.net'], ['interactive' => false]);
    expect($written['MAIL_FROM_ADDRESS'])->toBe('panel@example.test')
        ->and($written['MAIL_FROM_NAME'])->toBe('Aquadactyl');
    if ($driver === 'smtp') {
        expect($written)->toMatchArray(['MAIL_HOST' => 'mail.example.test', 'MAIL_PORT' => '587', 'MAIL_USERNAME' => 'test-user', 'MAIL_PASSWORD' => 'test-password', 'MAIL_ENCRYPTION' => 'tls']);
    } elseif ($driver === 'mailgun') {
        expect($written)->toMatchArray(['MAILGUN_DOMAIN' => 'mail.example.test', 'MAILGUN_SECRET' => 'test-password', 'MAILGUN_ENDPOINT' => 'api.eu.mailgun.net']);
    } elseif ($driver === 'mandrill') {
        expect($written['MANDRILL_SECRET'])->toBe('test-password');
    } elseif ($driver === 'postmark') {
        expect($written)->toMatchArray(['MAIL_DRIVER' => 'smtp', 'MAIL_HOST' => 'smtp.postmarkapp.com', 'MAIL_PORT' => 587, 'MAIL_USERNAME' => 'test-user', 'MAIL_PASSWORD' => 'test-user']);
    } else {
        expect($written['MAIL_DRIVER'])->toBe('sendmail');
    }
    expect($tester->getDisplay())->not->toContain('test-password');
})->with(['smtp', 'mailgun', 'mandrill', 'postmark', 'sendmail']);

test('interactive mail configuration uses configured defaults and a secret password prompt', function (string $driver) {
    config()->set('mail.default', $driver);
    config()->set('mail.from.address', 'panel@example.test');
    $command = Mockery::mock(EmailSettingsCommand::class . '[choice,ask,secret,writeToEnvironment]', [$this->app['config']]);
    $command->setLaravel($this->app);
    $command->shouldReceive('choice')->andReturnUsing(fn ($question, $choices, $default) => $default ?? 'tls');
    $command->shouldReceive('ask')->andReturnUsing(fn ($question, $default) => $default ?? 'configured-value');
    $command->shouldReceive('secret')->andReturn('test-secret');
    $written = [];
    $command->shouldReceive('writeToEnvironment')->once()->andReturnUsing(function ($values) use (&$written) { $written = $values; });
    (new CommandTester($command))->execute([], ['interactive' => true]);
    expect($written['MAIL_FROM_ADDRESS'])->toBe('panel@example.test')
        ->and($written['MAIL_DRIVER'])->toBe($driver === 'postmark' ? 'smtp' : $driver);
})->with(['smtp', 'mailgun', 'mandrill', 'postmark']);
