<?php

namespace Pterodactyl\Tests\Integration\Api\Client;

use Pterodactyl\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Pterodactyl\Events\ActivityLogged;
use Illuminate\Support\Facades\Storage;
use Pterodactyl\Services\Users\UserDeletionService;

class AccountAvatarControllerTest extends ClientApiIntegrationTestCase
{
    public function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function testUploadUpdatesOnlyTheAuthenticatedAccountAndReencodesTheImage(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $file = UploadedFile::fake()->image('picture.png', 400, 200);
        file_put_contents($file->getPathname(), '<?php echo "embedded payload"; ?>', FILE_APPEND);

        $response = $this->actingAs($user)->post('/api/client/account/avatar', ['avatar' => $file, 'user_id' => $other->id]);

        $response->assertOk();
        $path = $user->refresh()->avatar;
        $this->assertNotNull($path);
        $this->assertNull($other->refresh()->avatar);
        $response->assertJsonPath('attributes.avatar_url', '/storage/' . $path);
        Storage::disk('public')->assertExists($path);
        $contents = Storage::disk('public')->get($path);
        $this->assertStringNotContainsString('<?php', $contents);
        $image = getimagesizefromstring($contents);
        $this->assertSame([256, 256, IMAGETYPE_PNG], [$image[0], $image[1], $image[2]]);
        $this->assertActivityFor('user:account.avatar-updated', $user, $user);
    }

    public function testReplacingAPictureDeletesTheOldFile(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post('/api/client/account/avatar', ['avatar' => UploadedFile::fake()->image('first.png')])->assertOk();
        $old = $user->refresh()->avatar;
        $this->post('/api/client/account/avatar', ['avatar' => UploadedFile::fake()->image('second.jpg')])->assertOk();

        $this->assertNotSame($old, $user->refresh()->avatar);
        Storage::disk('public')->assertMissing($old);
        Storage::disk('public')->assertExists($user->avatar);
    }

    public function testWebpUploadsAreSupported(): void
    {
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
    }

    public function testRemovalDeletesTheFileAndRestoresTheDefaultAvatar(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post('/api/client/account/avatar', ['avatar' => UploadedFile::fake()->image('picture.png')])->assertOk();
        $path = $user->refresh()->avatar;

        Event::fake([ActivityLogged::class]);
        $this->deleteJson('/api/client/account/avatar')->assertOk()->assertJsonPath('attributes.avatar_url', null);
        $this->assertNull($user->refresh()->avatar);
        Storage::disk('public')->assertMissing($path);
        $this->assertActivityFor('user:account.avatar-removed', $user, $user);
        $this->deleteJson('/api/client/account/avatar')->assertOk();
    }

    public function testInvalidUploadsDoNotReplaceTheExistingPicture(): void
    {
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
            $this->assertSame($path, $user->refresh()->avatar);
            Storage::disk('public')->assertExists($path);
        }

        $this->post('/api/client/account/avatar')->assertUnprocessable();
        $this->assertSame([$path], Storage::disk('public')->allFiles('avatars'));
    }

    public function testUnauthenticatedUsersCannotUploadOrRemovePictures(): void
    {
        $this->post('/api/client/account/avatar', ['avatar' => UploadedFile::fake()->image('picture.png')])->assertUnauthorized();
        $this->deleteJson('/api/client/account/avatar')->assertUnauthorized();
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function testDeletingAUserRemovesTheirProfilePicture(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post('/api/client/account/avatar', ['avatar' => UploadedFile::fake()->image('picture.png')])->assertOk();
        $path = $user->refresh()->avatar;
        $this->app->make(UserDeletionService::class)->handle($user);

        $this->assertModelMissing($user);
        Storage::disk('public')->assertMissing($path);
    }
}
