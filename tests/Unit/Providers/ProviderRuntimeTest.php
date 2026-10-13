<?php

use Pterodactyl\Models\User;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Broadcast;
use Pterodactyl\Providers\AppServiceProvider;
use Pterodactyl\Providers\BladeServiceProvider;
use Pterodactyl\Extensions\Backups\BackupManager;
use Pterodactyl\Providers\BackupsServiceProvider;
use Pterodactyl\Providers\BroadcastServiceProvider;

test('application version data supports repository references and packaged releases', function (bool $git) {
    $files = new Filesystem();
    $original = $this->app->basePath();
    $directory = sys_get_temp_dir() . '/provider-version-' . bin2hex(random_bytes(8));
    $files->makeDirectory($directory . '/.git/refs/heads', 0700, true);
    if ($git) {
        $files->put($directory . '/.git/HEAD', 'ref: refs/heads/main');
        $files->put($directory . '/.git/refs/heads/main', '0123456789abcdef');
    }
    $provider = new class($this->app) extends AppServiceProvider {
        public function version(): array
        {
            return $this->versionData();
        }
    };
    Cache::forget('git-version');
    try {
        $this->app->setBasePath($directory);
        expect($provider->version())->toBe(['version' => $git ? '01234567' : config('app.version'), 'is_git' => $git]);
    } finally {
        $this->app->setBasePath($original);
        Cache::forget('git-version');
        $files->deleteDirectory($directory);
    }
})->with([true, false]);

test('personal broadcast channels authorize only their owning account', function () {
    $authorize = null;
    Broadcast::shouldReceive('routes')->once();
    Broadcast::shouldReceive('channel')->once()->with('App.User.*', Mockery::on(function ($callback) use (&$authorize) {
        $authorize = $callback;

        return true;
    }));
    (new BroadcastServiceProvider($this->app))->boot();
    $user = User::factory()->make(['id' => 42]);
    expect($authorize($user, '42'))->toBeTrue()->and($authorize($user, '43'))->toBeFalse();
});

test('Blade time directives use the configured timezone and deferred backup bindings resolve a singleton', function () {
    (new BladeServiceProvider($this->app))->boot();
    $compiled = app('blade.compiler')->compileString('@datetimeHuman("2026-10-13 16:00:00")');
    expect($compiled)->toContain('config(\'app.timezone\')', '2026-10-13 16:00:00');
    expect((new BackupsServiceProvider($this->app))->provides())->toBe([BackupManager::class]);
    expect(app(BackupManager::class))->toBe(app(BackupManager::class));
    expect(app('extensions.themes'))->toBeInstanceOf(Pterodactyl\Extensions\Themes\Theme::class);
});

test('HTTPS application URLs force secure links even when the backend request uses HTTP', function () {
    config()->set('app.url', 'https://panel.example.test');
    try {
        (new AppServiceProvider($this->app))->boot();
        expect(url('/admin/settings'))->toStartWith('https://');
    } finally {
        Illuminate\Support\Facades\URL::forceScheme(null);
    }
});

test('production provider registration includes saved settings when environment-only mode is disabled', function () {
    config()->set('pterodactyl.load_environment_only', false);
    $application = Mockery::mock(Illuminate\Foundation\Application::class);
    $application->expects('scoped')->with(Pterodactyl\Services\Users\LanguageService::class);
    $application->expects('environment')->andReturn('production');
    $application->expects('register')->with(Pterodactyl\Providers\Blueprint\ExtensionfsConfigProvider::class);
    $application->expects('register')->with(Pterodactyl\Providers\Blueprint\RouteServiceProvider::class);
    $application->expects('register')->with(Pterodactyl\Providers\SettingsServiceProvider::class);
    $application->expects('singleton')->with('extensions.themes', Mockery::type(Closure::class));
    (new AppServiceProvider($application))->register();
});
