<?php

test('file editor limits support Aquadactyl defaults and legacy configuration with explicit precedence', function (?string $current, ?string $legacy, int|string $expected) {
    $variables = ['AQUADACTYL_FILES_MAX_EDIT_SIZE' => $current, 'PTERODACTYL_FILES_MAX_EDIT_SIZE' => $legacy];
    $original = [];
    foreach ($variables as $key => $value) {
        $original[$key] = [$_ENV[$key] ?? null, $_SERVER[$key] ?? null, getenv($key)];
        unset($_ENV[$key], $_SERVER[$key]);
        putenv($key);
        if ($value !== null) {
            $_ENV[$key] = $_SERVER[$key] = $value;
            putenv($key . '=' . $value);
        }
    }

    try {
        $configuration = require config_path('pterodactyl.php');
        expect($configuration['files']['max_edit_size'])->toBe($expected);
    } finally {
        foreach ($original as $key => [$environment, $server, $process]) {
            unset($_ENV[$key], $_SERVER[$key]);
            if ($environment !== null) {
                $_ENV[$key] = $environment;
            }
            if ($server !== null) {
                $_SERVER[$key] = $server;
            }
            putenv($process === false ? $key : $key . '=' . $process);
        }
    }
})->with([
    'default 32 MiB' => [null, null, 33554432],
    'Aquadactyl key' => ['67108864', null, '67108864'],
    'legacy installation' => [null, '8388608', '8388608'],
    'Aquadactyl overrides legacy' => ['16777216', '8388608', '16777216'],
]);
