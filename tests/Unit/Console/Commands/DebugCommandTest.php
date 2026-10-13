<?php

use Pterodactyl\Console\Commands\DebugCommand;
use Pterodactyl\Services\Debug\DebugPasteService;
use Symfony\Component\Console\Tester\CommandTester;

test('debug uploads print only the returned link and preserve requested expiration', function (?string $expiration) {
    $service = Mockery::mock(DebugPasteService::class);
    $service->shouldReceive('readLog')->once()->with(null)->andReturn('log content');
    $service->shouldReceive('upload')->once()->with('log content', $expiration === null ? null : (int) $expiration)->andReturn('https://debug.example.test/paste/coverage');
    $command = new DebugCommand($service);
    $command->setLaravel($this->app);
    $tester = new CommandTester($command);
    expect($tester->execute($expiration === null ? [] : ['--expires' => $expiration]))->toBe(0);
    expect($tester->getDisplay())->toContain('https://debug.example.test/paste/coverage')->not->toContain('log content');
})->with([null, '3600']);

test('debug previews redact logs without uploading them', function () {
    $service = Mockery::mock(DebugPasteService::class);
    $service->shouldReceive('readLog')->once()->with('custom.log')->andReturn('secret');
    $service->shouldReceive('redact')->once()->with('secret')->andReturn('[REDACTED]');
    $service->shouldNotReceive('upload');
    $command = new DebugCommand($service);
    $command->setLaravel($this->app);
    $tester = new CommandTester($command);
    expect($tester->execute(['--dry-run' => true, '--file' => 'custom.log']))->toBe(0)->and($tester->getDisplay())->toBe('[REDACTED]');
});

test('debug failures return a failure status instead of exposing a stack trace', function (string $failure) {
    $service = Mockery::mock(DebugPasteService::class);
    if ($failure === 'expiration') {
        $service->shouldNotReceive('readLog');
    } else {
        $service->shouldReceive('readLog')->andThrow(new RuntimeException('Log unavailable'));
    }
    $command = new DebugCommand($service);
    $command->setLaravel($this->app);
    $tester = new CommandTester($command);
    expect($tester->execute($failure === 'expiration' ? ['--expires' => '-1'] : []))->toBe(1);
    expect($tester->getDisplay())->not->toContain('Stack trace');
})->with(['expiration', 'read']);
