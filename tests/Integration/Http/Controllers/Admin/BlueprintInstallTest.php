<?php

use Pterodactyl\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Process;
use Pterodactyl\Models\BlueprintInstallation;
use Pterodactyl\Tests\Fixtures\RuntimeFaults;
use Pterodactyl\Services\Blueprint\BlueprintArchive;
use Pterodactyl\Services\Blueprint\BlueprintInstaller;
use Illuminate\Foundation\Testing\DatabaseTransactions;

require_once __DIR__ . '/../../../../Fixtures/RuntimeFaults.php';

uses(DatabaseTransactions::class);

function operationsBlueprintPackage(array $entries = ['conf.yml' => "info:\n  identifier: coverageaddon\n"], ?callable $prepare = null): string
{
    $path = tempnam(sys_get_temp_dir(), 'blueprint-test-');
    $zip = new ZipArchive();
    $zip->open($path, ZipArchive::OVERWRITE);
    foreach ($entries as $name => $content) {
        $zip->addFromString($name, $content);
    }
    $prepare?->__invoke($zip);
    $zip->close();

    return $path;
}

beforeEach(function () {
    RuntimeFaults::$enabled['blueprint.posix_available'] = true;
    RuntimeFaults::$enabled['blueprint.euid'] = 0;
    config()->set(['pterodactyl.auth.2fa_required' => 0, 'aquadactyl.blueprint.web_install_enabled' => true]);
    $this->admin = User::factory()->create(['root_admin' => true]);
    $this->actingAs($this->admin);
    Cache::put('blueprint-worker-heartbeat', time(), 45);
    Process::fake();
    $this->package = operationsBlueprintPackage();
});

afterEach(function () {
    unset(RuntimeFaults::$enabled['blueprint.posix_available'], RuntimeFaults::$enabled['blueprint.euid']);
    File::delete($this->package, base_path('coverageaddon.blueprint'));
    foreach (BlueprintInstallation::all() as $installation) {
        File::delete($installation->archivePath(), base_path('.blueprint-install-' . $installation->id));
    }
});

test('admin installer page shows readiness and keeps installation status private', function () {
    $this->get('/admin/extensions/install')->assertOk()->assertSee('Queue installation');
    $this->getJson('/admin/extensions/install/status')->assertOk()->assertExactJson(['data' => []]);
    Cache::forget('blueprint-worker-heartbeat');
    $this->get('/admin/extensions/install')->assertOk()->assertSee('disabled or is not running');
    config()->set('aquadactyl.blueprint.web_install_enabled', false);
    $this->postJson('/admin/extensions/install')->assertForbidden();
});

test('uploads require a worker fresh password and explicit trusted code approval', function (string $case) {
    $payload = ['current_password' => 'password', 'trusted' => '1', 'package' => new UploadedFile($this->package, 'test.blueprint', test: true)];
    if ($case === 'worker') {
        Cache::forget('blueprint-worker-heartbeat');
    }
    if ($case === 'password') {
        $payload['current_password'] = 'wrong';
    }
    if ($case === 'trust') {
        $payload['trusted'] = '0';
    }
    $this->postJson('/admin/extensions/install', $payload)->assertStatus($case === 'worker' ? 503 : 422);
    expect(BlueprintInstallation::count())->toBe(0);
})->with(['worker', 'password', 'trust']);

test('an invalid upload fails validation before creating an installation', function () {
    $this->postJson('/admin/extensions/install', ['current_password' => 'password', 'trusted' => '1', 'package' => UploadedFile::fake()->createWithContent('bad.blueprint', 'not a zip')])->assertUnprocessable();
});

test('valid uploads are stored privately and installed by the dedicated worker', function () {
    // This is the isolated test workspace, never the running panel's storage.
    File::deleteDirectory(storage_path('app/blueprint-installations'));
    $hash = hash_file('sha256', $this->package);
    $this->post('/admin/extensions/install', ['current_password' => 'password', 'trusted' => '1', 'package' => new UploadedFile($this->package, '../../unsafe.blueprint', test: true)])->assertRedirect('/admin/extensions/install');
    $installation = BlueprintInstallation::firstOrFail();
    expect($installation->status)->toBe('queued')->and($installation->sha256)->toBe($hash)->and(file_exists($installation->archivePath()))->toBeTrue();
    expect(fileperms(dirname($installation->archivePath())) & 0777)->toBe(0700);
    $this->artisan('p:blueprint:work --once')->assertSuccessful();
    expect($installation->fresh()->status)->toBe('completed')->and(file_exists($installation->archivePath()))->toBeFalse();
    Process::assertRan(fn ($process) => $process->command === ['bash', base_path('blueprint.sh'), '-bash', '-i', 'coverageaddon']);
    $this->getJson('/admin/extensions/install/status')->assertOk()->assertJsonPath('data.0.status', 'completed')->assertDontSee($hash);
});

test('the worker reports CLI failures without exposing process output', function () {
    Process::fake(['*' => Process::result(output: 'APP_KEY=private-secret', errorOutput: 'password=private-secret', exitCode: 1)]);
    $installation = BlueprintInstallation::create(['user_id' => $this->admin->id, 'identifier' => 'coverageaddon', 'sha256' => hash_file('sha256', $this->package)]);
    File::ensureDirectoryExists(dirname($installation->archivePath()));
    copy($this->package, $installation->archivePath());
    expect(app(BlueprintInstaller::class)->runNext())->toBeTrue()->and($installation->fresh()->status)->toBe('failed');
    $this->getJson('/admin/extensions/install/status')->assertDontSee('private-secret');
});

test('the worker rejects revoked admins modified packages missing archives changed identifiers and unapproved updates', function (string $case) {
    $installation = BlueprintInstallation::create(['user_id' => $this->admin->id, 'identifier' => $case === 'identifier' ? 'changed' : 'coverageaddon', 'sha256' => hash_file('sha256', $this->package)]);
    File::ensureDirectoryExists(dirname($installation->archivePath()));
    copy($this->package, $installation->archivePath());
    if ($case === 'revoked') {
        $this->admin->update(['root_admin' => false]);
    }
    if ($case === 'modified') {
        file_put_contents($installation->archivePath(), 'tampered');
    }
    if ($case === 'missing') {
        unlink($installation->archivePath());
    }
    if ($case === 'existing') {
        file_put_contents(base_path('coverageaddon.blueprint'), 'existing package');
    }
    app(BlueprintInstaller::class)->runNext();
    expect($installation->fresh()->status)->toBe('failed');
    Process::assertNothingRan();
})->with(['revoked', 'modified', 'missing', 'identifier', 'existing']);

test('explicitly confirmed updates can replace an existing package', function () {
    $installation = BlueprintInstallation::create(['user_id' => $this->admin->id, 'identifier' => 'coverageaddon', 'sha256' => hash_file('sha256', $this->package), 'allow_update' => true]);
    File::ensureDirectoryExists(dirname($installation->archivePath()));
    copy($this->package, $installation->archivePath());
    file_put_contents(base_path('coverageaddon.blueprint'), 'previous version');
    app(BlueprintInstaller::class)->runNext();
    expect($installation->fresh()->status)->toBe('completed')->and(hash_file('sha256', base_path('coverageaddon.blueprint')))->toBe($installation->sha256);
});

test('the privileged worker rejects disabled non-root and missing-POSIX environments before processing work', function (bool $enabled, bool $posixAvailable, int $uid) {
    config()->set('aquadactyl.blueprint.web_install_enabled', $enabled);
    RuntimeFaults::$enabled['blueprint.posix_available'] = $posixAvailable;
    RuntimeFaults::$enabled['blueprint.euid'] = $uid;
    Cache::forget('blueprint-worker-heartbeat');
    $this->mock(BlueprintInstaller::class)->shouldNotReceive('runNext');

    $this->artisan('p:blueprint:work --once')
        ->expectsOutput('Enable AQUADACTYL_BLUEPRINT_WEB_INSTALL_ENABLED and run this dedicated worker as root.')
        ->assertFailed();

    expect(Cache::has('blueprint-worker-heartbeat'))->toBeFalse();
    Process::assertNothingRan();
})->with([
    'disabled' => [false, true, 0],
    'non-root' => [true, true, 1001],
    'POSIX unavailable' => [true, false, 0],
]);

test('idle workers finish single runs and interrupted jobs are marked for review', function () {
    $installation = BlueprintInstallation::create(['user_id' => $this->admin->id, 'identifier' => 'coverageaddon', 'sha256' => str_repeat('a', 64), 'status' => 'running', 'updated_at' => now()->subHour()]);
    $this->artisan('p:blueprint:work --once')->assertSuccessful();
    expect($installation->fresh()->status)->toBe('failed')->and(app(BlueprintInstaller::class)->runNext())->toBeFalse();
});

test('archive inspection accepts a wrapped manifest and rejects reserved or executable identifiers', function (string $identifier, bool $valid) {
    $path = operationsBlueprintPackage(['wrapper/conf.yml' => "info:\n  identifier: '$identifier'\n"]);
    try {
        if ($valid) {
            expect(app(BlueprintArchive::class)->inspect($path))->toBe($identifier);
        } else {
            expect(fn () => app(BlueprintArchive::class)->inspect($path))->toThrow(RuntimeException::class);
        }
    } finally {
        unlink($path);
    }
})->with([['safe_addon', true], ['blueprint', false], ['../escape', false], ['addon;id', false], ['', false]]);

test('archive inspection rejects traversal symlinks multiple manifests and oversized manifests', function (string $case) {
    $entries = match ($case) {
        'traversal' => ['../escape' => 'x', 'conf.yml' => 'info: {}'],
        'absolute' => ['/etc/passwd' => 'x'],
        'windows' => ['C:\\escape' => 'x'],
        'symlink' => ['link' => '/etc/passwd'],
        'duplicate' => ['a/conf.yml' => 'info: {}', 'b/conf.yml' => 'info: {}'],
        'large-manifest' => ['conf.yml' => str_repeat('a', 65537)],
        'no-manifest' => ['file.txt' => 'x'],
    };
    $path = operationsBlueprintPackage($entries, $case === 'symlink' ? fn ($zip) => $zip->setExternalAttributesName('link', ZipArchive::OPSYS_UNIX, 0120777 << 16) : null);
    try {
        expect(fn () => app(BlueprintArchive::class)->inspect($path))->toThrow(RuntimeException::class);
    } finally {
        unlink($path);
    }
})->with(['traversal', 'absolute', 'windows', 'symlink', 'duplicate', 'large-manifest', 'no-manifest']);

test('archive inspection rejects excessive entry counts', function () {
    $entries = [];
    for ($i = 0; $i <= 10000; ++$i) {
        $entries['file-' . $i] = '';
    }
    $path = operationsBlueprintPackage($entries);
    try {
        expect(fn () => app(BlueprintArchive::class)->inspect($path))->toThrow(RuntimeException::class);
    } finally {
        unlink($path);
    }
});

test('archive expansion limits reject highly compressed oversized content', function () {
    $large = tempnam(sys_get_temp_dir(), 'blueprint-large-');
    $handle = fopen($large, 'wb');
    ftruncate($handle, 536870913);
    fclose($handle);
    $path = operationsBlueprintPackage(['conf.yml' => "info:\n  identifier: coverageaddon\n"], fn ($zip) => $zip->addFile($large, 'large.bin'));
    try {
        expect(fn () => app(BlueprintArchive::class)->inspect($path))->toThrow(RuntimeException::class, 'expanded package');
    } finally {
        unlink($large);
        unlink($path);
    }
});

test('a package modified during inspection fails the staged integrity check', function () {
    $installation = BlueprintInstallation::create(['user_id' => $this->admin->id, 'identifier' => 'coverageaddon', 'sha256' => hash_file('sha256', $this->package)]);
    File::ensureDirectoryExists(dirname($installation->archivePath()));
    copy($this->package, $installation->archivePath());
    $this->mock(BlueprintArchive::class)->shouldReceive('inspect')->once()->andReturnUsing(function ($path) {
        file_put_contents($path, 'modified after inspection');

        return 'coverageaddon';
    });
    app(BlueprintInstaller::class)->runNext();
    expect($installation->fresh()->status)->toBe('failed')->and(file_exists(base_path('.blueprint-install-' . $installation->id)))->toBeFalse();
    Process::assertNothingRan();
});

test('pre-existing staging files cannot be overwritten by a root installation', function () {
    $installation = BlueprintInstallation::create(['user_id' => $this->admin->id, 'identifier' => 'coverageaddon', 'sha256' => hash_file('sha256', $this->package)]);
    File::ensureDirectoryExists(dirname($installation->archivePath()));
    copy($this->package, $installation->archivePath());
    file_put_contents(base_path('.blueprint-install-' . $installation->id), 'stale staging file');
    app(BlueprintInstaller::class)->runNext();
    expect($installation->fresh()->status)->toBe('failed');
    Process::assertNothingRan();
});

test('continuous workers publish heartbeats between idle polling iterations', function () {
    $manager = Mockery::mock(Illuminate\Cache\CacheManager::class, [app()])->makePartial();
    Cache::swap($manager);
    $manager->shouldReceive('put')->once()->ordered()->with('blueprint-worker-heartbeat', Mockery::type('int'), 45)->andReturnTrue();
    Cache::shouldReceive('put')->once()->ordered()->andThrow(new RuntimeException('stop-test-worker'));
    $this->mock(BlueprintInstaller::class)->shouldReceive('runNext')->once()->andReturnFalse();
    expect(fn () => Illuminate\Support\Facades\Artisan::call('p:blueprint:work'))->toThrow(RuntimeException::class, 'stop-test-worker');
});
