<?php

use Illuminate\Support\Facades\Http;
use Pterodactyl\Services\Servers\EnvironmentService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Helpers\BlueprintExtensionLibrary;
use Pterodactyl\BlueprintFramework\Controllers\GetRouteEggsRequest;
use Pterodactyl\BlueprintFramework\Controllers\ExtensionRouteController;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Console\BlueprintConsoleLibrary;

uses(DatabaseTransactions::class);

test('legacy addon settings remain usable while deprecated file and notification helpers stay inert', function () {
    $library = app(BlueprintExtensionLibrary::class);
    $library->dbSet('coverage-legacy', 'setting', 'configured');
    expect($library->dbGet('coverage-legacy', 'setting'))->toBe('configured');
    expect($library->notify('legacy'))->toBeFalse()->and($library->notifyAfter(1, 'legacy'))->toBeFalse()->and($library->notifyNow('legacy'))->toBeFalse();
    expect($library->fileRead('/nonexistent'))->toBeFalse()->and($library->fileMake('/nonexistent'))->toBeFalse()->and($library->fileWipe('/nonexistent'))->toBeFalse();
});

test('addon route permissions return configured eggs and preserve the all-eggs default', function () {
    $controller = app(ExtensionRouteController::class);
    $request = GetRouteEggsRequest::create('/extension-eggs', 'GET', ['id' => 'coverage-legacy']);
    expect($request->authorize())->toBeTrue()->and($controller->eggs($request))->toBe(['-1']);
    app(BlueprintExtensionLibrary::class)->dbSet('blueprint', 'extensionconfig_coverage-legacy_eggs', '["1","2"]');
    expect($controller->eggs($request))->toBe(['1', '2']);
});

test('Blueprint diagnostic commands retain their public output and cache settings', function () {
    $library = app(BlueprintConsoleLibrary::class);
    $library->dbSet('blueprint', 'flags:is_developer', true);
    $capture = function (Closure $callback): string {
        ob_start();
        try {
            $callback();

            return ob_get_contents();
        } finally {
            ob_end_clean();
        }
    };
    $this->withoutMockingConsoleOutput();
    expect($capture(fn () => $this->artisan('bp:developer')))->toBe('true');
    $library->dbSet('blueprint', 'flags:is_developer', false);
    expect($capture(fn () => $this->artisan('bp:developer')))->toBe('false');
    expect($capture(fn () => $this->artisan('bp:cache')))->toContain('Flushed Blueprint');
    expect((int) $library->dbGet('blueprint', 'cache'))->toBeGreaterThan(0);
    Http::fake(['*' => Http::response(['name' => 'coverage-release'])]);
    $library->dbSet('blueprint', 'internal:version:latest', '');
    expect($capture(fn () => $this->artisan('bp:version:latest')))->toContain('coverage-release');
});

test('dynamic server environment callbacks override defaults without leaking to other service instances', function () {
    $server = $this->createServerModel();
    $service = app(EnvironmentService::class);
    $service->setEnvironmentKey('P_SERVER_UUID', fn ($model) => 'custom-' . $model->uuid);
    $service->setEnvironmentKey('COVERAGE_MEMORY', fn ($model) => $model->memory);
    expect($service->getEnvironmentKeys())->toHaveCount(2);
    expect($service->handle($server)['P_SERVER_UUID'])->toBe('custom-' . $server->uuid)->and($service->handle($server)['COVERAGE_MEMORY'])->toBe($server->memory);
    expect((new EnvironmentService())->handle($server)['P_SERVER_UUID'])->toBe($server->uuid);
});
