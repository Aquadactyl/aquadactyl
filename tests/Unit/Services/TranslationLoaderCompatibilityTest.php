<?php

use Illuminate\Filesystem\Filesystem;
use Pterodactyl\Services\Translations\TranslationLoader;

test('translation packs reject unsafe paths and retain namespaced and legacy PHP domains', function () {
    $files = new Filesystem();
    $directory = sys_get_temp_dir() . '/translation-loader-' . bin2hex(random_bytes(8));
    $files->makeDirectory($directory . '/en', 0700, true);
    $files->put($directory . '/en/admin.php', '<?php return ["ui" => ["legacy" => "Legacy label"]];');
    $files->put($directory . '/en/addon.php', '<?php return ["button" => "Addon action"];');
    $files->put($directory . '/en.json', '{"Hello":"Hello world"}');
    try {
        $loader = new TranslationLoader($files, $directory);
        expect($loader->load('../en', 'admin/ui'))->toBe([])->and($loader->load('en', '../admin'))->toBe([]);
        expect($loader->load('en', 'admin/ui'))->toBe(['legacy' => 'Legacy label']);
        $loader->addNamespace('addon', $directory);
        expect($loader->load('en', 'addon', 'addon'))->toBe(['button' => 'Addon action']);
        expect($loader->load('en', '*', '*'))->toBe(['Hello' => 'Hello world']);
    } finally {
        $files->deleteDirectory($directory);
    }
});
