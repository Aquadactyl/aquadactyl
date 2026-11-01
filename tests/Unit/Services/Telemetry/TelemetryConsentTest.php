<?php

use Mockery as m;
use Illuminate\Support\Facades\Http;
use Database\Seeders\BlueprintSeeder;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Console\Scheduling\Schedule;
use Pterodactyl\Repositories\Eloquent\SettingsRepository;
use Pterodactyl\Services\Telemetry\BlueprintTelemetryCollectionService;
use Pterodactyl\Services\Telemetry\AquadactylTelemetryCollectionService;
use Pterodactyl\BlueprintFramework\Services\PlaceholderService\BlueprintPlaceholderService;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Console\BlueprintConsoleLibrary;

beforeEach(function () {
    Http::preventStrayRequests();
    Http::fake();
});

test('all telemetry defaults are opt in', function () {
    expect(config('aquadactyl.telemetry.enabled'))->toBeFalse()
        ->and((new BlueprintSeeder(m::mock(BlueprintConsoleLibrary::class)))->getDefaultsForFlag('flags:telemetry_enabled'))->toBeFalse();
});

test('legacy upstream settings cannot restore its telemetry schedule or command', function () {
    expect(config('pterodactyl'))->not->toHaveKey('telemetry');

    // Simulate an old cached setting from before upstream telemetry was removed.
    config()->set('pterodactyl.telemetry.enabled', true);
    $commands = app(Kernel::class)->all();
    expect($commands)->not->toHaveKey('p:telemetry')
        ->and($commands['p:environment:setup']->getDefinition()->hasOption('telemetry'))->toBeFalse();

    $descriptions = collect(app(Schedule::class)->events())->pluck('description')->all();
    expect($descriptions)->not->toContain('Collect Telemetry');
    Http::assertNothingSent();
});

test('disabled collectors neither gather data nor send requests', function (mixed $disabled) {
    config()->set('aquadactyl.telemetry.enabled', $disabled);
    $settings = m::mock(SettingsRepository::class);
    $aquadactyl = m::mock(AquadactylTelemetryCollectionService::class, [$settings])->makePartial();
    $aquadactyl->shouldReceive('collect')->never();
    $aquadactyl();

    $blueprintLibrary = m::mock(BlueprintConsoleLibrary::class);
    $blueprintLibrary->shouldReceive('dbGet')->with('blueprint', 'flags:telemetry_enabled', false)->once()->andReturn($disabled);
    $blueprint = m::mock(BlueprintTelemetryCollectionService::class, [
        $blueprintLibrary, m::mock(BlueprintPlaceholderService::class), m::mock(BlueprintSeeder::class),
    ])->makePartial();
    $blueprint->shouldReceive('collect')->never();
    $blueprint();

    Http::assertNothingSent();
})->with([false, 'false', 0, '0', null]);

test('enabled Aquadactyl telemetry sends only its collection payload', function () {
    config()->set('aquadactyl.telemetry.enabled', true);
    config()->set('aquadactyl.telemetry.endpoint', 'https://telemetry.example.invalid/panel');
    $payload = ['schema' => 1, 'instanceId' => 'test-instance', 'resources' => ['users' => 2]];
    $collector = m::mock(AquadactylTelemetryCollectionService::class, [m::mock(SettingsRepository::class)])->makePartial();
    $collector->shouldReceive('collect')->once()->andReturn($payload);
    $collector();

    Http::assertSent(fn ($request) => $request->url() === 'https://telemetry.example.invalid/panel' && $request->data() === $payload);
    Http::assertSentCount(1);
});

test('an unset Aquadactyl endpoint skips collection even when enabled', function () {
    config()->set('aquadactyl.telemetry.enabled', true);
    config()->set('aquadactyl.telemetry.endpoint', '');
    $collector = m::mock(AquadactylTelemetryCollectionService::class, [m::mock(SettingsRepository::class)])->makePartial();
    $collector->shouldReceive('collect')->never();
    $collector();
    Http::assertNothingSent();
});
