<?php

use Pterodactyl\Models\User;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    $this->admin = User::factory()->create(['root_admin' => true]);
    $this->user = User::factory()->create(['root_admin' => false]);
    $this->logDir = storage_path('logs');

    if (!File::isDirectory($this->logDir)) {
        File::makeDirectory($this->logDir, 0755, true);
    }
});

test('guest cannot access log viewer', function () {
    $this->get(route('admin.settings.logs'))->assertForbidden();
});

test('non-admin user cannot access log viewer', function () {
    $this->actingAs($this->user)->get(route('admin.settings.logs'))->assertForbidden();
});

test('admin can access log viewer without logs', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.settings.logs'));

    $response->assertOk();
    $response->assertViewIs('admin.settings.logs');
    $response->assertViewHas('files');
});

test('admin can view existing log file and parse entries', function () {
    $testFile = 'laravel-test-' . uniqid() . '.log';
    $logPath = $this->logDir . '/' . $testFile;

    $sampleContent = "[2026-10-11 12:00:00] local.ERROR: Test error occurred {\"context\":\"data\"}\n#0 /app/test.php(10): sample()\n[2026-10-11 12:05:00] local.INFO: All systems nominal\n";
    File::put($logPath, $sampleContent);

    try {
        $response = $this->actingAs($this->admin)->get(route('admin.settings.logs', ['file' => $testFile]));

        $response->assertOk();
        $response->assertViewIs('admin.settings.logs');
        $response->assertViewHas('content', function ($content) {
            return str_contains($content, 'Test error occurred') && str_contains($content, 'All systems nominal');
        });
        $response->assertSee('Test error occurred');
        $response->assertSee('All systems nominal');
    } finally {
        if (File::exists($logPath)) {
            File::delete($logPath);
        }
    }
});

test('admin can download a log file', function () {
    $testFile = 'laravel-download-' . uniqid() . '.log';
    $logPath = $this->logDir . '/' . $testFile;
    File::put($logPath, "Test log content for download\n");

    try {
        $response = $this->actingAs($this->admin)->get(route('admin.settings.logs.download', ['file' => $testFile]));

        $response->assertOk();
        $response->assertHeader('content-disposition', 'attachment; filename=' . $testFile);
        expect($response->streamedContent())->toContain('Test log content for download');
    } finally {
        if (File::exists($logPath)) {
            File::delete($logPath);
        }
    }
});

test('admin cannot download a non-existent log file', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.settings.logs.download', ['file' => 'nonexistent-log-file.log']));
    $response->assertRedirect(route('admin.settings.logs'));
});

test('log viewer service prevents path traversal', function () {
    $service = app(Pterodactyl\Services\Helpers\LogViewerService::class);
    expect($service->getLogPath('../../../etc/passwd'))->toBeNull();
    expect($service->getLogPath('foo/bar.log'))->toBeNull();
    expect($service->deleteLog('../../../etc/passwd'))->toBeFalse();
});

test('admin can delete a log file', function () {
    $testFile = 'laravel-delete-' . uniqid() . '.log';
    $logPath = $this->logDir . '/' . $testFile;
    File::put($logPath, "Log file to be deleted\n");

    expect(File::exists($logPath))->toBeTrue();

    $response = $this->actingAs($this->admin)->delete(route('admin.settings.logs.delete', ['file' => $testFile]));

    $response->assertRedirect(route('admin.settings.logs'));
    expect(File::exists($logPath))->toBeFalse();
});
