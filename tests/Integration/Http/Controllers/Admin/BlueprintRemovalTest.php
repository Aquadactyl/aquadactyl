<?php

use Pterodactyl\Models\User;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Process;
use Pterodactyl\Models\BlueprintInstallation;
use Pterodactyl\Services\Blueprint\BlueprintInstaller;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Blueprint\BlueprintExtensionRegistry;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set(['pterodactyl.auth.2fa_required' => 0, 'aquadactyl.blueprint.web_install_enabled' => true]);
    $this->admin = User::factory()->create(['root_admin' => true]);
    $this->actingAs($this->admin);
    $this->registry = base_path('.blueprint/extensions/blueprint/private/db/installed_extensions');
    $this->previousRegistry = is_file($this->registry) ? file_get_contents($this->registry) : null;
    File::ensureDirectoryExists(dirname($this->registry));
    File::put($this->registry, ($this->previousRegistry ?? '') . '|removalfixture,');
    $this->extension = base_path('.blueprint/extensions/removalfixture');
    File::ensureDirectoryExists($this->extension . '/private/.store');
    File::put($this->extension . '/private/.store/conf.yml', "info:\n  identifier: removalfixture\n");
    Cache::put('blueprint-worker-heartbeat', time(), 45);
    Process::fake();
});

afterEach(function () {
    File::deleteDirectory($this->extension);
    if ($this->previousRegistry === null) {
        File::delete($this->registry);
    } else {
        File::put($this->registry, $this->previousRegistry);
    }
});

test('extension removal requires an administrator session', function () {
    $this->actingAs(User::factory()->create(['root_admin' => false]));
    $this->getJson('/admin/extensions/removalfixture/remove')->assertForbidden();
    $this->postJson('/admin/extensions/removalfixture/remove', ['current_password' => 'password', 'confirm_removal' => '1'])->assertForbidden();
    expect(BlueprintInstallation::count())->toBe(0);
});

test('removal confirmation displays the extension and worker availability', function () {
    $this->get('/admin/extensions/removalfixture/remove')->assertOk()->assertSee('removalfixture')->assertSee('Queue removal');
    Cache::forget('blueprint-worker-heartbeat');
    $this->get('/admin/extensions/removalfixture/remove')->assertOk()->assertSee('disabled or is not running')->assertDontSee('id="remove-password"', false);
    config()->set('aquadactyl.blueprint.web_install_enabled', false);
    $this->get('/admin/extensions/removalfixture/remove')->assertOk()->assertSee('disabled or is not running');
});

test('removal refuses disabled workers missing passwords and missing acknowledgement', function (string $case, int $status) {
    $payload = ['current_password' => 'password', 'confirm_removal' => '1'];
    if ($case === 'disabled') {
        config()->set('aquadactyl.blueprint.web_install_enabled', false);
    } elseif ($case === 'worker') {
        Cache::forget('blueprint-worker-heartbeat');
    } elseif ($case === 'password') {
        $payload['current_password'] = 'incorrect';
    } else {
        unset($payload['confirm_removal']);
    }
    $this->postJson('/admin/extensions/removalfixture/remove', $payload)->assertStatus($status);
    expect(BlueprintInstallation::count())->toBe(0);
    Process::assertNothingRan();
})->with([['disabled', 403], ['worker', 503], ['password', 422], ['acknowledgement', 422]]);

test('reserved missing and unsafe identifiers cannot be removed', function (string $identifier) {
    expect(app(BlueprintExtensionRegistry::class)->installed($identifier))->toBeFalse();
    $this->getJson('/admin/extensions/' . rawurlencode($identifier) . '/remove')->assertNotFound();
    $this->postJson('/admin/extensions/' . rawurlencode($identifier) . '/remove', ['current_password' => 'password', 'confirm_removal' => '1'])->assertNotFound();
    expect(BlueprintInstallation::count())->toBe(0);
})->with(['blueprint', 'notinstalled', '--yes', 'addon;id', 'UPPERCASE', str_repeat('a', 49)]);

test('unregistered and linked extension directories cannot enter the removal worker', function (string $case) {
    if ($case === 'registry') {
        File::put($this->registry, '');
    } elseif ($case === 'directory') {
        File::deleteDirectory($this->extension);
    } elseif ($case === 'manifest') {
        File::delete($this->extension . '/private/.store/conf.yml');
    } else {
        File::deleteDirectory($this->extension);
        symlink(dirname($this->extension) . '/blueprint', $this->extension);
    }
    expect(app(BlueprintExtensionRegistry::class)->installed('removalfixture'))->toBeFalse();
    $this->postJson('/admin/extensions/removalfixture/remove', ['current_password' => 'password', 'confirm_removal' => '1'])->assertNotFound();
    if ($case === 'symlink') {
        unlink($this->extension);
    }
})->with(['registry', 'directory', 'manifest', 'symlink']);

test('confirmed removal queues safely and executes the noninteractive Blueprint uninstall command', function () {
    $this->post('/admin/extensions/removalfixture/remove', ['current_password' => 'password', 'confirm_removal' => '1'])->assertRedirect('/admin/extensions/install#installation-history');
    $operation = BlueprintInstallation::firstOrFail();
    expect($operation->operation)->toBe('remove')->and($operation->status)->toBe('queued')->and(is_file($operation->archivePath()))->toBeFalse();
    Process::assertNothingRan();
    $this->get('/admin/extensions/install')->assertOk()->assertSee('Recent Blueprint activity')->assertSee('removalfixture');
    $this->artisan('p:blueprint:work --once')->assertSuccessful();
    expect($operation->fresh()->status)->toBe('completed')->and($operation->fresh()->message)->toBe('Extension removed.');
    Process::assertRan(fn ($process) => $process->command === ['bash', base_path('blueprint.sh'), '-bash', '-r', 'removalfixture', '--yes']);
    $this->getJson('/admin/extensions/install/status')->assertOk()->assertJsonPath('data.0.operation', 'remove')->assertDontSee('sha256');
    $this->get('/admin/extensions/install')->assertOk()->assertSee('Removed');
});

test('pending installs and removals prevent accidental duplicate removal requests', function (string $status, string $operation) {
    BlueprintInstallation::create(['user_id' => $this->admin->id, 'identifier' => 'removalfixture', 'sha256' => '', 'status' => $status, 'operation' => $operation]);
    expect(fn () => $this->withoutExceptionHandling()->postJson('/admin/extensions/removalfixture/remove', ['current_password' => 'password', 'confirm_removal' => '1']))
        ->toThrow(Illuminate\Validation\ValidationException::class, __('admin/operations.extension_busy'));
    expect(BlueprintInstallation::count())->toBe(1);
})->with([['uploading', 'install'], ['queued', 'remove'], ['running', 'install']]);

test('a busy worker still permits queued removals after its short heartbeat expires', function () {
    Cache::forget('blueprint-worker-heartbeat');
    BlueprintInstallation::create(['user_id' => $this->admin->id, 'identifier' => 'otheraddon', 'sha256' => '', 'status' => 'running']);
    $this->get('/admin/extensions/removalfixture/remove')->assertOk()->assertSee('Queue removal');
    $this->post('/admin/extensions/removalfixture/remove', ['current_password' => 'password', 'confirm_removal' => '1'])->assertRedirect();
    expect(BlueprintInstallation::count())->toBe(2);
});

test('removal jobs recheck admin access and the installed registry before running code', function (string $case) {
    $operation = BlueprintInstallation::create(['user_id' => $this->admin->id, 'identifier' => 'removalfixture', 'sha256' => '', 'operation' => 'remove']);
    if ($case === 'revoked') {
        $this->admin->update(['root_admin' => false]);
    } else {
        File::put($this->registry, '');
    }
    expect(app(BlueprintInstaller::class)->runNext())->toBeTrue()->and($operation->fresh()->status)->toBe('failed');
    Process::assertNothingRan();
})->with(['revoked', 'uninstalled']);

test('removal failures never expose hook output or exception secrets', function (bool $exception) {
    $operation = BlueprintInstallation::create(['user_id' => $this->admin->id, 'identifier' => 'removalfixture', 'sha256' => '', 'operation' => 'remove']);
    if ($exception) {
        $this->mock(BlueprintExtensionRegistry::class)->shouldReceive('installed')->once()->andThrow(new RuntimeException('password=private-secret'));
    } else {
        Process::fake(['*' => Process::result(output: 'password=private-secret', errorOutput: 'token=private-secret', exitCode: 1)]);
    }
    app(BlueprintInstaller::class)->runNext();
    expect($operation->fresh()->status)->toBe('failed');
    $this->getJson('/admin/extensions/install/status')->assertDontSee('private-secret');
})->with([true, false]);

test('unknown operation types fail closed without invoking Blueprint', function () {
    $operation = BlueprintInstallation::create(['user_id' => $this->admin->id, 'identifier' => 'removalfixture', 'sha256' => '', 'operation' => 'unsupported']);
    app(BlueprintInstaller::class)->runNext();
    expect($operation->fresh()->status)->toBe('failed');
    Process::assertNothingRan();
});
