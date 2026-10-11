<?php

use Pterodactyl\Providers\SettingsServiceProvider;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

$setEnv = function (string $key, ?string $value) {
    if ($value === null) {
        unset($_ENV[$key], $_SERVER[$key]);
        putenv($key);
    } else {
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
        putenv("{$key}={$value}");
    }
};

$bootProvider = function () {
    app()->call([new SettingsServiceProvider(app()), 'boot']);
};

afterEach(function () use ($setEnv) {
    $settingsRepo = app(SettingsRepositoryInterface::class);
    $settingsRepo->forget('settings::recaptcha:enabled');
    $settingsRepo->forget('settings::aquadactyl:features:registration');
    $settingsRepo->forget('settings::pterodactyl:guzzle:timeout');
    $settingsRepo->forget('settings::aquadactyl:telemetry:enabled');

    $setEnv('RECAPTCHA_ENABLED', null);
    $setEnv('AQUADACTYL_FEATURE_REGISTRATION', null);
    $setEnv('GUZZLE_TIMEOUT', null);
    $setEnv('AQUADACTYL_TELEMETRY_ENABLED', null);
});

test('a saved telemetry consent overrides the initial environment default in UI mode', function () use ($setEnv, $bootProvider) {
    $settings = app(SettingsRepositoryInterface::class);
    $setEnv('AQUADACTYL_TELEMETRY_ENABLED', 'false');
    config()->set('aquadactyl.telemetry.enabled', false);
    $settings->set('settings::aquadactyl:telemetry:enabled', 'true');
    $bootProvider();
    expect(config('aquadactyl.telemetry.enabled'))->toBeTrue();
    $settings->set('settings::aquadactyl:telemetry:enabled', 'false');
    $bootProvider();
    expect(config('aquadactyl.telemetry.enabled'))->toBeFalse();
});

test('environment variables override database settings for recaptcha', function () use ($setEnv, $bootProvider) {
    $settingsRepo = app(SettingsRepositoryInterface::class);

    // Database has recaptcha enabled
    $settingsRepo->set('settings::recaptcha:enabled', 'true');

    // Environment variable has recaptcha disabled
    $setEnv('RECAPTCHA_ENABLED', 'false');

    $bootProvider();

    expect(config('recaptcha.enabled'))->toBeFalse();

    // Now test opposite: database has recaptcha disabled, env enables it
    $settingsRepo->set('settings::recaptcha:enabled', 'false');
    $setEnv('RECAPTCHA_ENABLED', 'true');

    $bootProvider();

    expect(config('recaptcha.enabled'))->toBeTrue();
});

test('database settings are used when environment variable is not defined', function () use ($setEnv, $bootProvider) {
    $settingsRepo = app(SettingsRepositoryInterface::class);

    $setEnv('RECAPTCHA_ENABLED', null);

    $settingsRepo->set('settings::recaptcha:enabled', 'true');
    $bootProvider();
    expect(config('recaptcha.enabled'))->toBeTrue();

    $settingsRepo->set('settings::recaptcha:enabled', 'false');
    $bootProvider();
    expect(config('recaptcha.enabled'))->toBeFalse();
});

test('environment variables override database settings for registration and timeout', function () use ($setEnv, $bootProvider) {
    $settingsRepo = app(SettingsRepositoryInterface::class);

    // Test registration feature
    $settingsRepo->set('settings::aquadactyl:features:registration', 'true');
    $setEnv('AQUADACTYL_FEATURE_REGISTRATION', 'false');
    $bootProvider();
    expect(config('aquadactyl.features.registration'))->toBeFalse();

    // Test guzzle timeout
    $settingsRepo->set('settings::pterodactyl:guzzle:timeout', '60');
    $setEnv('GUZZLE_TIMEOUT', '15');
    $bootProvider();
    expect(config('pterodactyl.guzzle.timeout'))->toBe('15');
});
