<?php

use Pterodactyl\Services\Servers\GameQuery\GameQueryRunner;

test('the query process accepts only successful bounded integer player counts', function (string $output, int $exitCode, bool $available) {
    $directory = sys_get_temp_dir() . '/game-query-runner-' . bin2hex(random_bytes(8));
    mkdir($directory, 0700);
    $binary = $directory . '/runner';
    file_put_contents($binary, "#!/bin/sh\ncat > " . escapeshellarg($directory . '/input.json') . "\nprintf '%s' " . escapeshellarg($output) . "\nexit $exitCode\n");
    chmod($binary, 0700);
    config()->set('game-query.node_binary', $binary);
    $target = ['host' => '192.0.2.10', 'port' => 25565, 'game' => 'minecraft'];
    try {
        $result = app(GameQueryRunner::class)->query($target);
        expect(json_decode(file_get_contents($directory . '/input.json'), true))->toBe($target);
        expect($result)->toBe($available ? ['status' => 'available', 'players' => 0, 'max_players' => 20] : ['status' => 'unavailable', 'players' => null, 'max_players' => null]);
    } finally {
        unlink($binary);
        if (is_file($directory . '/input.json')) {
            unlink($directory . '/input.json');
        }
        rmdir($directory);
    }
})->with([
    ['{"status":"available","players":0,"max_players":20}', 0, true],
    ['{"status":"available","players":0,"max_players":20}', 1, false],
    ['invalid', 0, false],
    ['{}', 0, false],
    ['{"status":"available","players":-1,"max_players":20}', 0, false],
    ['{"status":"available","players":1000001,"max_players":20}', 0, false],
    ['{"status":"available","players":"1","max_players":20}', 0, false],
    ['{"status":"available","players":0,"max_players":-1}', 0, false],
    ['{"status":"available","players":0,"max_players":1000001}', 0, false],
    ['{"status":"available","players":0}', 0, false],
]);

test('missing game query runtimes fail closed without interrupting panel requests', function () {
    config()->set('game-query.node_binary', '/nonexistent/coverage-runtime');
    expect(app(GameQueryRunner::class)->query(['host' => '192.0.2.10']))->toBe(['status' => 'unavailable', 'players' => null, 'max_players' => null]);
});
