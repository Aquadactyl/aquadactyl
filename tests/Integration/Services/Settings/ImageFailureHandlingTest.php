<?php

use Pterodactyl\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Filesystem\FilesystemAdapter;
use Pterodactyl\Exceptions\DisplayException;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Services\Settings\SiteLogoService;
use Pterodactyl\Services\Users\ProfilePictureService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Settings\SiteBackgroundService;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

uses(DatabaseTransactions::class);

test('invalid image contents cannot be saved as a logo background or avatar', function (string $kind) {
    Storage::fake('public');
    $file = UploadedFile::fake()->createWithContent('invalid.png', 'not an image');
    $user = User::factory()->create();
    $upload = fn () => match ($kind) {
        'logo' => app(SiteLogoService::class)->upload($file),
        'background' => app(SiteBackgroundService::class)->upload('login', $file),
        default => app(ProfilePictureService::class)->upload($user, $file),
    };
    expect($upload)->toThrow(ValidationException::class);
    expect(Storage::disk('public')->allFiles())->toBe([]);
})->with(['logo', 'background', 'avatar']);

test('image uploads report storage failures before changing account or appearance settings', function (string $kind) {
    $disk = Mockery::mock(FilesystemAdapter::class);
    $disk->shouldReceive('put')->once()->andReturnFalse();
    Storage::shouldReceive('disk')->with('public')->andReturn($disk);
    $file = UploadedFile::fake()->image('valid.png', 64, 64);
    $user = User::factory()->create();
    expect(fn () => match ($kind) {
        'logo' => app(SiteLogoService::class)->upload($file),
        'background' => app(SiteBackgroundService::class)->upload('login', $file),
        default => app(ProfilePictureService::class)->upload($user, $file),
    })->toThrow(DisplayException::class);
    expect($user->fresh()->avatar)->toBeNull();
})->with(['logo', 'background', 'avatar']);

test('failed appearance persistence cleans up newly uploaded files and also supports failed removal', function (string $kind, bool $upload) {
    Storage::fake('public');
    $this->mock(SettingsRepositoryInterface::class)->shouldReceive('set')->once()->andThrow(new RuntimeException('settings unavailable'));
    $file = UploadedFile::fake()->image('valid.png', 64, 64);
    $service = app($kind === 'logo' ? SiteLogoService::class : SiteBackgroundService::class);
    expect(fn () => $kind === 'logo' ? ($upload ? $service->upload($file) : $service->remove()) : ($upload ? $service->upload('login', $file) : $service->remove('login')))->toThrow(RuntimeException::class, 'settings unavailable');
    expect(Storage::disk('public')->allFiles())->toBe([]);
})->with([['logo', true], ['logo', false], ['background', true], ['background', false]]);

test('an account removed during an avatar upload leaves no orphaned file', function (bool $upload) {
    Storage::fake('public');
    $user = User::factory()->create();
    $user->delete();
    $service = app(ProfilePictureService::class);
    expect(fn () => $upload ? $service->upload($user, UploadedFile::fake()->image('valid.png')) : $service->remove($user))->toThrow(Illuminate\Database\Eloquent\ModelNotFoundException::class);
    expect(Storage::disk('public')->allFiles())->toBe([]);
})->with([true, false]);
