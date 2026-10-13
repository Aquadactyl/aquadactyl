<?php

use Ramsey\Uuid\Uuid;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Database\Seeders\BlueprintSeeder;
use Pterodactyl\Services\Telemetry\BlueprintTelemetryCollectionService;
use Pterodactyl\BlueprintFramework\Services\PlaceholderService\BlueprintPlaceholderService;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Console\BlueprintConsoleLibrary;

test('Blueprint telemetry remains disabled unless explicitly enabled', function (mixed $enabled) {
    Http::fake();
    $library = Mockery::mock(BlueprintConsoleLibrary::class);
    $library->shouldReceive('dbGet')->once()->with('blueprint', 'flags:telemetry_enabled', false)->andReturn($enabled);
    $service = new BlueprintTelemetryCollectionService($library, Mockery::mock(BlueprintPlaceholderService::class), Mockery::mock(BlueprintSeeder::class));
    $service();
    Http::assertNothingSent();
})->with([false, 'false', '0', null]);

test('Blueprint telemetry collects an anonymous identifier, flags and extension metadata', function (bool $newInstance, bool $withFlags) {
    $library = Mockery::mock(BlueprintConsoleLibrary::class);
    $library->shouldReceive('dbGet')->with('blueprint', 'internal:uuid')->andReturn($newInstance ? null : '12345678-1234-1234-1234-123456789abc');
    if ($newInstance) {
        $library->shouldReceive('dbSet')->once()->with('blueprint', 'internal:uuid', Mockery::on(fn ($uuid) => Uuid::isValid($uuid)))->andReturn(true);
    }
    $schema = Mockery::mock(BlueprintSeeder::class);
    $schema->shouldReceive('getSchema')->andReturn($withFlags ? ['flags' => ['on' => [], 'off' => [], 'default' => [], 'custom' => []]] : []);
    if ($withFlags) {
        $library->shouldReceive('dbGet')->with('blueprint', 'flags:on')->andReturn('1');
        $library->shouldReceive('dbGet')->with('blueprint', 'flags:off')->andReturn('0');
        $library->shouldReceive('dbGet')->with('blueprint', 'flags:default')->andReturn(null);
        $library->shouldReceive('dbGet')->with('blueprint', 'flags:custom')->andReturn('custom-value');
        $schema->shouldReceive('getDefaultsForFlag')->with('flags:default')->andReturn(false);
    }
    $library->shouldReceive('extensionsConfigs')->andReturn(collect([['info' => ['identifier' => 'sample']], []]));
    $placeholders = Mockery::mock(BlueprintPlaceholderService::class);
    $placeholders->shouldReceive('version')->andReturn('test-version');
    $pdo = Mockery::mock(PDO::class);
    $pdo->shouldReceive('getAttribute')->with(PDO::ATTR_SERVER_VERSION)->andReturn('11.0');
    DB::shouldReceive('getPdo')->andReturn($pdo);
    $data = (new BlueprintTelemetryCollectionService($library, $placeholders, $schema))->collect();
    expect(Uuid::isValid($data['id']))->toBeTrue()
        ->and($data['telemetry_version'])->toBe(1)
        ->and($data['blueprint']['version'])->toBe('test-version')
        ->and($data['blueprint']['extensions'])->toBe([['identifier' => 'sample'], null])
        ->and($data['blueprint']['flags'])->toBe($withFlags ? ['on' => true, 'off' => false, 'default' => false, 'custom' => 'custom-value'] : [])
        ->and($data['panel']['drivers']['database']['version'])->toBe('11.0');
})->with([[false, true], [true, true], [false, false]]);

test('Blueprint telemetry collection errors never make network requests', function () {
    Http::fake();
    $library = Mockery::mock(BlueprintConsoleLibrary::class);
    $library->shouldReceive('dbGet')->with('blueprint', 'flags:telemetry_enabled', false)->andReturn(true);
    $service = Mockery::mock(BlueprintTelemetryCollectionService::class, [$library, Mockery::mock(BlueprintPlaceholderService::class), Mockery::mock(BlueprintSeeder::class)])->makePartial();
    $service->shouldReceive('collect')->andThrow(new RuntimeException('unable to collect'));
    $service();
    Http::assertNothingSent();
});

test('enabled Blueprint telemetry submits its collected payload with bounded timeouts', function () {
    Http::fake(['https://blueprint.example.test/api/telemetry' => Http::response([], 200)]);
    $library = Mockery::mock(BlueprintConsoleLibrary::class);
    $library->shouldReceive('dbGet')->with('blueprint', 'flags:telemetry_enabled', false)->andReturn(true);
    $placeholders = Mockery::mock(BlueprintPlaceholderService::class);
    $placeholders->shouldReceive('api_url')->andReturn('https://blueprint.example.test');
    $service = Mockery::mock(BlueprintTelemetryCollectionService::class, [$library, $placeholders, Mockery::mock(BlueprintSeeder::class)])->makePartial();
    $service->shouldReceive('collect')->andReturn(['id' => 'anonymous']);
    $service();
    Http::assertSent(fn ($request) => $request->url() === 'https://blueprint.example.test/api/telemetry' && $request['id'] === 'anonymous');
});
