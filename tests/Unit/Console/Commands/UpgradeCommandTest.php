<?php

use Illuminate\Console\Command;
use Pterodactyl\Console\Commands\UpgradeCommand;

test('legacy upgrade directs operators to the fork updater', function () {
    $command = new UpgradeCommand();
    $command->setLaravel($this->app);

    $application = new Symfony\Component\Console\Application();
    $application->addCommand($command);
    $tester = new Symfony\Component\Console\Tester\CommandTester($command);
    $status = $tester->execute([
        '--url' => 'https://example.invalid/upstream.tar.gz',
        '--release' => '1.0.0',
        '--skip-download' => true,
    ], ['interactive' => false]);

    expect($status)->toBe(Command::FAILURE)
        ->and($tester->getDisplay())->toContain('scripts/panel-update.sh <release-tag> Aquadactyl/aquadactyl')
        ->and($tester->getDisplay())->toContain('panel-update.sh --archive');
});
