<?php

use Pterodactyl\BlueprintFramework\Services\PlaceholderService\BlueprintPlaceholderService;

test('installed version and status', function () {
    $service = new BlueprintPlaceholderService();

    expect($service->version())->toBe('beta-2026-08')
        ->and($service->installed())->toBe('INSTALLED');
});

test('installer replacement preserves the installed version', function (string $version) {
    $source = file_get_contents(dirname(__DIR__, 3) . '/app/BlueprintFramework/Services/PlaceholderService/BlueprintPlaceholderService.php');
    $className = 'InstalledBlueprintPlaceholderService_' . md5($version);
    $source = str_replace(['beta-2026-08', 'class BlueprintPlaceholderService'], [$version, 'class ' . $className], $source);
    $path = tempnam(sys_get_temp_dir(), 'aquadactyl-blueprint-');

    try {
        file_put_contents($path, $source);
        require $path;
        $class = 'Pterodactyl\\BlueprintFramework\\Services\\PlaceholderService\\' . $className;
        $service = new $class();

        expect($service->version())->toBe($version)
            ->and($service->installed())->toBe('INSTALLED');
    } finally {
        unlink($path);
    }
})->with(['beta-2026-08', 'beta-2026-10', 'rolling']);
