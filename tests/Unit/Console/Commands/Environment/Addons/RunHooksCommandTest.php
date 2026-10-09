<?php

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Testing\PendingCommand;
use Illuminate\Support\Facades\Process;

afterEach(function () {
    File::deleteDirectory(base_path('addons'));
});

function runAddonHooks(mixed $test, string $event = 'post-install'): PendingCommand
{
    return $test->artisan('p:environment:addons:run-hooks', ['event' => $event, '--no-interaction' => true]);
}

function makeAddonHook(string $addon, string $event = 'post-install', bool $executable = true): string
{
    $path = base_path("addons/{$addon}/hooks/{$event}");

    File::ensureDirectoryExists(dirname($path));
    File::put($path, "#!/usr/bin/env bash\nexit 0\n");

    if ($executable) {
        chmod($path, 0o755);
    }

    return $path;
}

test('hooks are skipped when disabled', function () {
    config(['addons.hooks_enabled' => false]);
    Process::fake();
    makeAddonHook('example');

    runAddonHooks($this)->assertExitCode(Command::SUCCESS);

    Process::assertNothingRan();
});

test('executable hooks run for event', function () {
    config(['addons.hooks_enabled' => true]);
    Process::fake();
    $first = makeAddonHook('alpha');
    $second = makeAddonHook('beta');

    runAddonHooks($this)->assertExitCode(Command::SUCCESS);

    Process::assertRan(fn ($process) => $process->command === [$first]);
    Process::assertRan(fn ($process) => $process->command === [$second]);
});

test('non executable files are ignored', function () {
    config(['addons.hooks_enabled' => true]);
    Process::fake();
    $executable = makeAddonHook('alpha');
    $ignored = makeAddonHook('beta', executable: false);

    runAddonHooks($this)->assertExitCode(Command::SUCCESS);

    Process::assertRan(fn ($process) => $process->command === [$executable]);
    Process::assertDidntRun(fn ($process) => $process->command === [$ignored]);
});

test('invalid event name is rejected', function () {
    config(['addons.hooks_enabled' => true]);
    Process::fake();

    runAddonHooks($this, 'BadEvent')
        ->expectsOutputToContain('Invalid hook event name')
        ->assertExitCode(Command::INVALID);

    Process::assertNothingRan();
});

test('failing hook does not abort remaining hooks', function () {
    config(['addons.hooks_enabled' => true]);
    $failing = makeAddonHook('broken');
    $passing = makeAddonHook('healthy');

    Process::fake([
        '*broken*' => Process::result(exitCode: 3),
        '*' => Process::result(),
    ]);

    runAddonHooks($this)
        ->expectsOutputToContain('exited with an error')
        ->assertExitCode(Command::SUCCESS);

    Process::assertRan(fn ($process) => $process->command === [$failing]);
    Process::assertRan(fn ($process) => $process->command === [$passing]);
});

test('declined confirmation skips hooks', function () {
    config(['addons.hooks_enabled' => true]);
    Process::fake();
    makeAddonHook('example');

    $this->artisan('p:environment:addons:run-hooks', ['event' => 'post-install'])
        ->expectsConfirmation('Execute 1 addon hook script(s) for the "post-install" event? They run with the privileges of this process.', 'no')
        ->assertExitCode(Command::SUCCESS);

    Process::assertNothingRan();
});
