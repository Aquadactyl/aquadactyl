<?php

use Pterodactyl\Exceptions\PterodactylException;
use Pterodactyl\Traits\Commands\EnvironmentWriterTrait;

test('environment updates replace duplicates append keys and safely quote values', function () {
    $original = $this->app->basePath();
    $temporary = sys_get_temp_dir() . '/environment-writer-' . bin2hex(random_bytes(8));
    mkdir($temporary, 0700);
    file_put_contents($temporary . '/.env', "APP_NAME=old\nAPP_NAME=duplicate\nUNCHANGED=value\n");
    try {
        $this->app->setBasePath($temporary);
        $writer = new class {
            use EnvironmentWriterTrait;
        };
        $writer->writeToEnvironment(['app_name' => 'Aquadactyl Panel', 'new_key' => 'some value', 'nullable' => null]);
        $contents = file_get_contents($temporary . '/.env');
        expect(substr_count($contents, 'APP_NAME="Aquadactyl Panel"'))->toBe(2)->and($contents)->toContain('UNCHANGED=value', 'NEW_KEY="some value"', 'NULLABLE=');
        unlink($temporary . '/.env');
        expect(fn () => $writer->writeToEnvironment([]))->toThrow(PterodactylException::class, 'Cannot locate .env file');
    } finally {
        $this->app->setBasePath($original);
        if (is_file($temporary . '/.env')) {
            unlink($temporary . '/.env');
        }
        rmdir($temporary);
    }
});

test('strict object lookup distinguishes a missing field from null and supports lazy defaults', function () {
    $value = (object) ['nested' => (object) ['nullable' => null, 'name' => 'Panel']];
    expect(object_get_strict($value, 'nested.nullable', 'fallback'))->toBeNull();
    expect(object_get_strict($value, 'nested.name'))->toBe('Panel');
    expect(object_get_strict($value, 'nested.missing', fn () => 'lazy'))->toBe('lazy');
    expect(object_get_strict($value, 'nested.nullable.name', 'fallback'))->toBe('fallback');
    expect(object_get_strict($value, null))->toBe($value)->and(object_get_strict($value, ' '))->toBe($value);
});
