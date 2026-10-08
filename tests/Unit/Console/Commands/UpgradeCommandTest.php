<?php

namespace Pterodactyl\Tests\Unit\Console\Commands;

use Illuminate\Console\Command;
use Pterodactyl\Tests\TestCase;
use Pterodactyl\Console\Commands\UpgradeCommand;

class UpgradeCommandTest extends TestCase
{
    public function testLegacyUpgradeDirectsOperatorsToTheForkUpdater(): void
    {
        // Resolving the command directly avoids unrelated boot-time migration checks.
        $command = new UpgradeCommand();
        $command->setLaravel($this->app);

        $application = new \Symfony\Component\Console\Application();
        $application->add($command);
        $tester = new \Symfony\Component\Console\Tester\CommandTester($command);
        $status = $tester->execute([
            '--url' => 'https://example.invalid/upstream.tar.gz',
            '--release' => '1.0.0',
            '--skip-download' => true,
        ], ['interactive' => false]);

        $this->assertSame(Command::FAILURE, $status);
        $this->assertStringContainsString('scripts/panel-update.sh <release-tag> Aquadactyl/aquadactyl', $tester->getDisplay());
        $this->assertStringContainsString('panel-update.sh --archive', $tester->getDisplay());
    }
}
