<?php

use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;
use Pterodactyl\Services\Helpers\LogViewerService;

beforeEach(function () {
    $this->originalStoragePath = $this->app->storagePath();
    $this->temporaryLogStorage = sys_get_temp_dir() . '/aquadactyl-log-test-' . Str::random(16);
    $this->app->useStoragePath($this->temporaryLogStorage);
    File::makeDirectory(storage_path('logs'), 0755, true);
    $this->viewer = new LogViewerService();
});
afterEach(function () {
    $this->app->useStoragePath($this->originalStoragePath);
    File::deleteDirectory($this->temporaryLogStorage);
});

test('log listings filter directories and other files and sort modification times', function () {
    File::put(storage_path('logs/old.log'), 'old');
    File::put(storage_path('logs/new.log'), str_repeat('x', 2048));
    File::put(storage_path('logs/readme.txt'), 'ignore');
    File::makeDirectory(storage_path('logs/directory.log'));
    touch(storage_path('logs/old.log'), 1_700_000_000);
    touch(storage_path('logs/new.log'), 1_700_000_100);
    $files = $this->viewer->getLogFiles();
    expect(array_column($files, 'name'))->toBe(['new.log', 'old.log'])
        ->and($files[0]['size'])->toBe('2 KB')
        ->and($files[0]['size_bytes'])->toBe(2048);
    File::deleteDirectory(storage_path('logs'));
    expect($this->viewer->getLogFiles())->toBe([]);
});

test('log entries handle severities, multiline stacks and newest-first limits', function () {
    $levels = ['ERROR', 'WARNING', 'INFO', 'DEBUG', 'NOTICE', 'ALERT', 'CUSTOM'];
    $content = "unrelated initial line\n";
    foreach ($levels as $index => $level) {
        $content .= "[2026-10-13 12:00:0{$index}] testing.{$level}: Message {$index}\n";
        if ($index === 0) {
            $content .= "#0 first frame\n#1 second frame\n";
        }
    }
    File::put(storage_path('logs/example.log'), $content);
    $all = $this->viewer->getLogEntries('example.log');
    expect($all['counts'])->toBe(['all' => 7, 'error' => 2, 'warning' => 1, 'info' => 2, 'debug' => 1])
        ->and($all['entries'][0]['message'])->toBe('Message 6')
        ->and($all['entries'][0]['level_class'])->toBe('label-primary')
        ->and($all['entries'][6]['stack'])->toBe("#0 first frame\n#1 second frame")
        ->and($all['raw'])->toBe($content)
        ->and($this->viewer->getLogEntries('example.log', 2)['entries'])->toHaveCount(2);
});

test('log reads discard a truncated first line and support an empty file', function () {
    File::put(storage_path('logs/tail.log'), "long initial line\nlast line\n");
    expect($this->viewer->getLogContent('tail.log', 15))->toBe("last line\n");
    File::put(storage_path('logs/tail.log'), 'abcdefghijklmnop');
    expect($this->viewer->getLogContent('tail.log', 5))->toBe('lmnop');
    File::put(storage_path('logs/empty.log'), '');
    expect($this->viewer->getLogContent('empty.log'))->toBe('')
        ->and($this->viewer->getLogEntries('empty.log')['entries'])->toBe([]);
});

test('log access rejects invalid names and never reads outside the log directory', function (string $name) {
    File::put(storage_path('secret.log'), 'private');
    expect($this->viewer->getLogContent($name))->toBe('')
        ->and($this->viewer->getLogPath($name))->toBeNull()
        ->and($this->viewer->deleteLog($name))->toBeFalse();
})->with(['', 'readme.txt', '../secret.log', 'missing.log']);

test('log downloads and deletion use the same safe path', function () {
    File::put(storage_path('logs/example.log'), 'hello');
    expect($this->viewer->getLogPath('../example.log'))->toBe(storage_path('logs/example.log'))
        ->and($this->viewer->deleteLog('example.log'))->toBeTrue()
        ->and($this->viewer->deleteLog('example.log'))->toBeFalse();
});
