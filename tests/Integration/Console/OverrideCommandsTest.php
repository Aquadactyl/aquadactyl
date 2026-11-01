<?php

use Illuminate\Database\Migrations\Migrator;
use Symfony\Component\Console\Tester\CommandTester;
use Pterodactyl\Console\Commands\Overrides\KeyGenerateCommand;

test('key generation warnings allow abandoning either confirmation without changing the encryption key', function (array $answers) {
    $key = config('app.key');
    $command = new KeyGenerateCommand();
    $command->setLaravel(app());
    $tester = new CommandTester($command);
    $tester->setInputs($answers);
    expect($tester->execute(['--show' => true], ['interactive' => true]))->toBe(0);
    expect($tester->getDisplay())->toContain('corruption')->and(config('app.key'))->toBe($key);
    if ($answers === ['yes', 'yes']) {
        expect($tester->getDisplay())->toMatch('/base64:[a-zA-Z0-9+\/=]+/');
    }
})->with([[['no']], [['yes', 'no']], [['yes', 'yes']]]);

test('maintenance and seed commands reject a missing migration repository or unapplied migrations', function (string $command, bool $repositoryExists) {
    $migrator = Mockery::mock(Migrator::class);
    $migrator->expects('getMigrationFiles')->with(database_path('migrations'))->andReturn(['pending_migration' => '/pending.php']);
    $migrator->expects('repositoryExists')->andReturn($repositoryExists);
    if ($repositoryExists) {
        $repository = Mockery::mock(Illuminate\Database\Migrations\MigrationRepositoryInterface::class);
        $repository->expects('getRan')->andReturn([]);
        $migrator->expects('getRepository')->andReturn($repository);
    }
    app()->instance('migrator', $migrator);
    $this->artisan($command)->expectsOutputToContain('Your database has not been properly migrated!')->assertExitCode(1);
})->with([['up', false], ['up', true], ['db:seed', false], ['db:seed', true]]);

test('completed migrations permit bringing the application out of maintenance', function () {
    $this->artisan('up')->assertExitCode(0);
    expect(app()->isDownForMaintenance())->toBeFalse();
});

test('completed migrations permit an explicitly selected empty seed class', function () {
    $seeder = new class extends Illuminate\Database\Seeder {
        public function run(): void
        {
        }
    };
    app()->instance('Coverage\\EmptySeeder', $seeder);
    $this->artisan('db:seed', ['--class' => 'Coverage\\EmptySeeder', '--force' => true])->assertExitCode(0);
});
