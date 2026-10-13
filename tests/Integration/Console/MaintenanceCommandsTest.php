<?php

use Carbon\CarbonImmutable;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Backup;
use Pterodactyl\Models\Location;
use Illuminate\Support\Facades\Storage;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('location creation and removal commands persist only the selected location', function () {
    $this->artisan('p:location:make', ['--short' => 'cli-location', '--long' => 'CLI location'])->assertExitCode(0);
    $location = Location::where('short', 'cli-location')->firstOrFail();
    expect($location->long)->toBe('CLI location');
    $this->artisan('p:location:delete', ['--short' => 'cli-location'])->expectsOutput(trans('command/messages.location.deleted'))->assertExitCode(0);
    $this->assertDatabaseMissing('locations', ['id' => $location->id]);
});

test('interactive location deletion retries a missing shortcode without deleting another location', function () {
    $location = Location::factory()->create(['short' => 'cli-retry']);
    $this->artisan('p:location:delete')->expectsQuestion(trans('command/messages.location.ask_short'), 'not-found')
        ->expectsOutput(trans('command/messages.location.no_location_found'))->expectsQuestion(trans('command/messages.location.ask_short'), 'cli-retry')->assertExitCode(0);
    $this->assertDatabaseMissing('locations', ['id' => $location->id]);
});

test('orphaned backup maintenance preserves completed and recent backups', function () {
    $server = $this->createServerModel();
    $stale = Backup::factory()->create(['server_id' => $server->id, 'created_at' => CarbonImmutable::now()->subMinutes(61), 'completed_at' => null]);
    $recent = Backup::factory()->create(['server_id' => $server->id, 'created_at' => CarbonImmutable::now()->subMinutes(59), 'completed_at' => null]);
    $completed = Backup::factory()->create(['server_id' => $server->id, 'created_at' => CarbonImmutable::now()->subDay(), 'completed_at' => CarbonImmutable::now(), 'is_successful' => true]);
    $this->artisan('p:maintenance:prune-backups', ['--prune-age' => '60'])->assertExitCode(0);
    expect($stale->fresh()->is_successful)->toBeFalse()->and($stale->fresh()->completed_at)->not->toBeNull();
    expect($recent->fresh()->completed_at)->toBeNull()->and($completed->fresh()->is_successful)->toBeTrue();
});

test('orphaned backup maintenance reports an empty queue', function () {
    Backup::query()->delete();
    $this->artisan('p:maintenance:prune-backups')->expectsOutput('There are no orphaned backups to be marked as failed.')->assertExitCode(0);
});

test('orphaned backup maintenance rejects invalid ages', function (string $age) {
    $this->withoutMockingConsoleOutput();
    expect(fn () => $this->artisan('p:maintenance:prune-backups', ['--prune-age' => $age]))->toThrow(InvalidArgumentException::class);
})->with(['0', '-1', 'abc']);

test('the recovery command disables two-factor authentication on only the selected account', function () {
    $user = User::factory()->create(['use_totp' => true, 'totp_secret' => encrypt('secret')]);
    $other = User::factory()->create(['use_totp' => true, 'totp_secret' => encrypt('other-secret')]);
    $this->artisan('p:user:disable2fa', ['--email' => $user->email])->assertExitCode(0);
    expect($user->fresh()->use_totp)->toBeFalse()->and($user->fresh()->totp_secret)->toBeNull()->and($other->fresh()->use_totp)->toBeTrue();
});

test('Blueprint storage diagnostics can retain or remove their test file', function (bool $clean) {
    Storage::fake('coverage');
    $this->artisan('bp:test:storage', ['--disk' => 'coverage', '--clean' => $clean ? 'Yes' : 'No'])->assertExitCode(0);
    if ($clean) {
        Storage::disk('coverage')->assertMissing('bp_fs_test.txt');
    } else {
        Storage::disk('coverage')->assertExists('bp_fs_test.txt');
    }
})->with([true, false]);

test('service backup cleanup removes only old files from the storage disk', function () {
    Storage::fake();
    $disk = Storage::disk();
    $disk->put('services/.bak/old.bak', 'old');
    $disk->put('services/.bak/recent.bak', 'recent');
    touch($disk->path('services/.bak/old.bak'), CarbonImmutable::now()->subMinutes(6)->getTimestamp());
    touch($disk->path('services/.bak/recent.bak'), CarbonImmutable::now()->subMinutes(4)->getTimestamp());
    $this->artisan('p:maintenance:clean-service-backups')->assertExitCode(0);
    $disk->assertMissing('services/.bak/old.bak');
    $disk->assertExists('services/.bak/recent.bak');
});
