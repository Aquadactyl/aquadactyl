<?php

use Pterodactyl\Models\User;
use Pterodactyl\Helpers\Utilities;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;
use Illuminate\Support\ViewErrorBag;
use Pterodactyl\Tests\Fixtures\RuntimeFaults;
use Pterodactyl\Services\Debug\DebugPasteService;
use Pterodactyl\Services\Helpers\LogViewerService;
use Pterodactyl\Services\Users\TwoFactorSetupService;
use Pterodactyl\Contracts\Repository\UserRepositoryInterface;

require_once __DIR__ . '/../../Fixtures/RuntimeFaults.php';

afterEach(function () { RuntimeFaults::$enabled = []; });

test('two-factor setup fails without saving a secret if system entropy is unavailable', function () {
    RuntimeFaults::$enabled['users.entropy'] = true;
    $this->mock(UserRepositoryInterface::class)->shouldNotReceive('update');
    expect(fn () => app(TwoFactorSetupService::class)->handle(User::factory()->make()))->toThrow(RuntimeException::class, 'Entropy source unavailable');
});

test('password generation reports entropy failures while retaining the requested length', function () {
    RuntimeFaults::$enabled['utilities.entropy'] = true;
    Log::shouldReceive('error')->once()->with(Mockery::type(RuntimeException::class));
    expect(Utilities::randomStringWithSpecialCharacters(24))->toHaveLength(24);
});

test('checkbox helpers retain submitted values after validation and digit helpers reject noninteger types', function () {
    $errors = new ViewErrorBag();
    $errors->put('default', new Illuminate\Support\MessageBag(['field' => 'invalid']));
    session()->put('errors', $errors);
    session()->flashInput(['checked' => '1', 'unchecked' => '0']);
    app('request')->setLaravelSession(session()->driver());
    expect(Utilities::checked('checked', false))->toBe('checked')->and(Utilities::checked('unchecked', true))->toBe('');
    expect(is_digit('123'))->toBeTrue()->and(is_digit(true))->toBeFalse()->and(is_digit(1.5))->toBeFalse();
    require app_path('helpers.php');
});

test('debug log read and open failures return controlled troubleshooting errors', function (string $failure) {
    $path = tempnam(sys_get_temp_dir(), 'debug-coverage-');
    file_put_contents($path, 'example log');
    RuntimeFaults::$enabled['debug.' . $failure] = true;
    try {
        expect(fn () => app(DebugPasteService::class)->readLog($path))->toThrow(RuntimeException::class, $failure === 'open' ? 'Unable to open' : 'Unable to read');
    } finally {
        unlink($path);
    }
})->with(['open', 'read']);

test('the log viewer returns empty content when a tail cannot be opened or read', function (string $failure) {
    $original = $this->app->storagePath();
    $directory = sys_get_temp_dir() . '/logs-runtime-' . bin2hex(random_bytes(8));
    File::ensureDirectoryExists($directory . '/logs');
    file_put_contents($directory . '/logs/runtime.log', str_repeat('log line\n', 10));
    $this->app->useStoragePath($directory);
    RuntimeFaults::$enabled['logs.' . $failure] = true;
    try {
        expect(app(LogViewerService::class)->getLogContent('runtime.log', 8))->toBe('');
        expect(app(LogViewerService::class)->getLogEntries('missing.log'))->toBe(['entries' => [], 'counts' => ['all' => 0, 'error' => 0, 'warning' => 0, 'info' => 0, 'debug' => 0], 'raw' => '']);
    } finally {
        $this->app->useStoragePath($original);
        File::deleteDirectory($directory);
    }
})->with(['open', 'read']);
