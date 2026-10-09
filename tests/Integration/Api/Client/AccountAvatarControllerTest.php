<?php

use Pterodactyl\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Pterodactyl\Events\ActivityLogged;
use Illuminate\Support\Facades\Storage;
use Pterodactyl\Services\Users\UserDeletionService;

beforeEach(function () {
    Storage::fake('public');
});

test('upload updates only the authenticated account and reencodes the image', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $file = UploadedFile::fake()->image('picture.png', 400, 200);
    file_put_contents($file->getPathname(), '<?php echo "embedded payload"; ?>', FILE_APPEND);

    $response = $this->actingAs($user)->post('/api/client/account/avatar', ['avatar' => $file, 'user_id' => $other->id]);

    $response->assertOk();
    $path = $user->refresh()->avatar;
    expect($path)->not->toBeNull();
    expect($other->refresh()->avatar)->toBeNull();
    $response->assertJsonPath('attributes.avatar_url', '/storage/' . $path);
    Storage::disk('public')->assertExists($path);
    $contents = Storage::disk('public')->get($path);
    expect($contents)->not->toContain('<?php');
    $image = getimagesizefromstring($contents);
    expect([$image[0], $image[1], $image[2]])->toBe([256, 256, IMAGETYPE_PNG]);
    $this->assertActivityFor('user:account.avatar-updated', $user, $user);
});

test('replacing a picture deletes the old file', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/api/client/account/avatar', ['avatar' => UploadedFile::fake()->image('first.png')])->assertOk();
    $old = $user->refresh()->avatar;
    $this->post('/api/client/account/avatar', ['avatar' => UploadedFile::fake()->image('second.jpg')])->assertOk();

    expect($user->refresh()->avatar)->not->toBe($old);
    Storage::disk('public')->assertMissing($old);
    Storage::disk('public')->assertExists($user->avatar);
});

test('webp uploads are supported', function () {
    $user = User::factory()->create();
    $path = tempnam(sys_get_temp_dir(), 'avatar-webp-');
    try {
        imagewebp(imagecreatetruecolor(50, 30), $path);
        $file = new UploadedFile($path, 'picture.webp', 'image/webp', null, true);
        $this->actingAs($user)->post('/api/client/account/avatar', ['avatar' => $file])->assertOk();
        Storage::disk('public')->assertExists($user->refresh()->avatar);
    } finally {
        unlink($path);
    }
});

test('removal deletes the file and restores the default avatar', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/api/client/account/avatar', ['avatar' => UploadedFile::fake()->image('picture.png')])->assertOk();
    $path = $user->refresh()->avatar;

    Event::fake([ActivityLogged::class]);
    $this->deleteJson('/api/client/account/avatar')->assertOk()->assertJsonPath('attributes.avatar_url', null);
    expect($user->refresh()->avatar)->toBeNull();
    Storage::disk('public')->assertMissing($path);
    $this->assertActivityFor('user:account.avatar-removed', $user, $user);
    $this->deleteJson('/api/client/account/avatar')->assertOk();
});

test('invalid uploads do not replace the existing picture', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/api/client/account/avatar', ['avatar' => UploadedFile::fake()->image('picture.png')])->assertOk();
    $path = $user->refresh()->avatar;

    $files = [
        UploadedFile::fake()->createWithContent('script.png', '<?php echo "not an image";'),
        UploadedFile::fake()->createWithContent('picture.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
        UploadedFile::fake()->image('large.png')->size(2049),
        UploadedFile::fake()->image('wide.png', 4097, 10),
    ];

    foreach ($files as $file) {
        $this->post('/api/client/account/avatar', ['avatar' => $file])->assertUnprocessable();
        expect($user->refresh()->avatar)->toBe($path);
        Storage::disk('public')->assertExists($path);
    }

    $this->post('/api/client/account/avatar')->assertUnprocessable();
    expect(Storage::disk('public')->allFiles('avatars'))->toBe([$path]);
});

test('unauthenticated users cannot upload or remove pictures', function () {
    $this->post('/api/client/account/avatar', ['avatar' => UploadedFile::fake()->image('picture.png')])->assertUnauthorized();
    $this->deleteJson('/api/client/account/avatar')->assertUnauthorized();
    expect(Storage::disk('public')->allFiles())->toBe([]);
});

test('deleting a user removes their profile picture', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post('/api/client/account/avatar', ['avatar' => UploadedFile::fake()->image('picture.png')])->assertOk();
    $path = $user->refresh()->avatar;
    app(UserDeletionService::class)->handle($user);

    $this->assertModelMissing($user);
    Storage::disk('public')->assertMissing($path);
});
