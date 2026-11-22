<?php

// Standalone component measurement. The baseline is trusted local PHP source,
// renamed to BaselineLanguageService; never pass unreviewed PHP to this command.
use Illuminate\Http\Request;
use Illuminate\Filesystem\Filesystem;
use Pterodactyl\Services\Users\LanguageService;
use Pterodactyl\Services\Users\BaselineLanguageService;

if (PHP_SAPI !== 'cli' || count($argv) !== 2 || !is_file($argv[1])) {
    fwrite(STDERR, "Usage: APP_ENV=testing php tests/Performance/locale-selection.php /trusted/BaselineLanguageService.php\n");
    exit(64);
}

require dirname(__DIR__, 2) . '/vendor/autoload.php';
$app = require dirname(__DIR__, 2) . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (!$app->environment('testing')) {
    throw new RuntimeException('Run only in the isolated testing environment.');
}
require $argv[1];
config(['app.locale' => 'en', 'app.fallback_locale' => 'en']);

$files = new Filesystem();
$request = Request::create('/api/client', 'GET', server: ['HTTP_ACCEPT_LANGUAGE' => 'fr-CA,fr;q=0.9,en;q=0.8']);
$variants = ['baseline' => BaselineLanguageService::class, 'candidate' => LanguageService::class];
if ((new BaselineLanguageService($files))->available() !== (new LanguageService($files))->available()) {
    throw new RuntimeException('Language metadata changed.');
}

$report = [
    'schemaVersion' => 1,
    'measuredOn' => gmdate('Y-m-d'),
    'php' => PHP_VERSION,
    'opcacheCli' => (bool) ini_get('opcache.enable_cli'),
    'iterationsPerBatch' => 5000,
    'installedCodes' => array_keys((new LanguageService($files))->available()),
    'methodology' => 'Fresh service per operation with real bundled language directories/JSON files and the same reusable Request/Filesystem. App boot and request construction excluded. One discarded 100-operation warm-up per variant/case, five measured 5000-operation batches each in alternating variant order. Warm filesystem/opcode caches; no concurrent test/build jobs. This measures locale selection, not full HTTP latency.',
    'runs' => [],
];
foreach (['explicit' => 'en', 'automatic' => 'auto'] as $case => $preference) {
    $expected = (new BaselineLanguageService($files))->forRequest($request, $preference);
    foreach ($variants as $class) {
        for ($i = 0; $i < 100; ++$i) {
            if ((new $class($files))->forRequest($request, $preference) !== $expected) {
                throw new RuntimeException('Locale selection changed.');
            }
        }
    }
    for ($round = 0; $round < 5; ++$round) {
        foreach ($round % 2 === 0 ? array_keys($variants) : array_reverse(array_keys($variants)) as $variant) {
            $class = $variants[$variant];
            $started = hrtime(true);
            for ($i = 0; $i < $report['iterationsPerBatch']; ++$i) {
                $actual = (new $class($files))->forRequest($request, $preference);
            }
            $elapsed = hrtime(true) - $started;
            if ($actual !== $expected) {
                throw new RuntimeException('Locale selection changed.');
            }
            $report['runs'][] = ['case' => $case, 'variant' => $variant, 'round' => $round + 1, 'nsPerOperation' => $elapsed / $report['iterationsPerBatch']];
        }
    }
}
$report['completedAt'] = gmdate(DATE_ATOM);
echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
