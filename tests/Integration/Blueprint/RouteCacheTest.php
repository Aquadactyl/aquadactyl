<?php

use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;

test('Blueprint addon routes survive a fresh route cache build', function (string $kind, string $prefix) {
    $identifier = 'route-cache-' . Str::lower(Str::random(12));
    $fixture = base_path('routes/blueprint/' . $kind . '/' . $identifier . '.php');
    $cachePath = base_path('bootstrap/cache/' . $identifier . '.php');
    $previousEnv = $_ENV['APP_ROUTES_CACHE'] ?? null;
    $previousServer = $_SERVER['APP_ROUTES_CACHE'] ?? null;
    $previousProcess = getenv('APP_ROUTES_CACHE');
    $name = 'blueprint.test.' . $identifier;

    File::put($fixture, '<?php \Illuminate\Support\Facades\Route::get("probe", [\Pterodactyl\Http\Controllers\Base\IndexController::class, "index"])->name("' . $name . '");');
    $_ENV['APP_ROUTES_CACHE'] = $_SERVER['APP_ROUTES_CACHE'] = $cachePath;
    putenv('APP_ROUTES_CACHE=' . $cachePath);

    try {
        // Loading the partial into this application before Laravel boots its fresh
        // cache application reproduces the first-start failure caused by require_once.
        Illuminate\Support\Facades\Route::group([], base_path('routes/blueprint/' . $kind . '.php'));
        $this->artisan('route:cache')->assertExitCode(0);
        expect(File::exists($cachePath))->toBeTrue();
        require $cachePath;
        $route = app('router')->getRoutes()->getByName($name);
        expect($route)->not->toBeNull();
        expect($route->uri())->toBe($prefix . '/' . $identifier . '/probe');
    } finally {
        File::delete([$fixture, $cachePath]);
        if ($previousEnv === null) {
            unset($_ENV['APP_ROUTES_CACHE']);
        } else {
            $_ENV['APP_ROUTES_CACHE'] = $previousEnv;
        }
        if ($previousServer === null) {
            unset($_SERVER['APP_ROUTES_CACHE']);
        } else {
            $_SERVER['APP_ROUTES_CACHE'] = $previousServer;
        }
        putenv($previousProcess === false ? 'APP_ROUTES_CACHE' : 'APP_ROUTES_CACHE=' . $previousProcess);
    }
})->with([
    ['web', 'extensions'],
    ['application', 'api/application/extensions'],
    ['client', 'api/client/extensions'],
]);
