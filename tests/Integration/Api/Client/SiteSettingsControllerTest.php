<?php

namespace Pterodactyl\Tests\Integration\Api\Client;

use Pterodactyl\Models\User;
use Pterodactyl\Models\Setting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Pterodactyl\Providers\SettingsServiceProvider;
use Pterodactyl\Services\Settings\SiteLogoService;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

class SiteSettingsControllerTest extends ClientApiIntegrationTestCase
{
    private const FEATURES = ['player_counts', 'custom_profile_pictures', 'privacy_mode', 'server_quick_actions'];

    public function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        if (!defined('LARAVEL_START')) {
            define('LARAVEL_START', microtime(true));
        }
    }

    protected function tearDown(): void
    {
        foreach (array_merge(['app:name', 'app:locale', 'pterodactyl:auth:2fa_required', 'aquadactyl:branding:logo_path', 'aquadactyl:branding:show_name'], array_map(fn ($feature) => 'aquadactyl:features:' . $feature, self::FEATURES)) as $key) {
            app(SettingsRepositoryInterface::class)->forget('settings::' . $key);
        }

        parent::tearDown();
    }

    private function payload(string $enabled = 'true'): array
    {
        return array_merge([
            'app:name' => 'Test Site',
            'aquadactyl:branding:show_name' => $enabled,
            'app:locale' => 'en',
            'pterodactyl:auth:2fa_required' => '0',
        ], array_fill_keys(array_map(fn ($feature) => 'aquadactyl:features:' . $feature, self::FEATURES), $enabled));
    }

    private function reloadSettings(): void
    {
        $this->app->call([new SettingsServiceProvider($this->app), 'boot']);
    }

    public function testOnlyAdminsCanChangeSettingsOrUploadAndRemoveTheLogo(): void
    {
        $this->actingAs(User::factory()->create())->patchJson('/admin/settings', $this->payload())->assertForbidden();
        $this->post('/admin/settings/logo', ['logo' => UploadedFile::fake()->image('logo.png')])->assertForbidden();
        $this->deleteJson('/admin/settings/logo')->assertForbidden();
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertDatabaseMissing('settings', ['key' => SiteLogoService::SETTING]);
    }

    public function testFeatureSettingsPersistAsBooleansAndReachTheClient(): void
    {
        $this->actingAs(User::factory()->create(['root_admin' => true]));
        foreach (['false' => false, 'true' => true] as $input => $expected) {
            $this->patchJson('/admin/settings', $this->payload($input))->assertRedirect('/admin/settings');
            $this->reloadSettings();
            $this->assertSame($expected, config('aquadactyl.branding.show_name'));
            foreach (self::FEATURES as $feature) {
                $this->assertDatabaseHas('settings', ['key' => 'settings::aquadactyl:features:' . $feature, 'value' => $input]);
                $this->assertSame($expected, config('aquadactyl.features.' . $feature));
            }
            $this->get('/')->assertOk()->assertSee('"showNameWithLogo":' . $input, false)->assertSee('"playerCounts":' . $input, false)
                ->assertSee('"customProfilePictures":' . $input, false)
                ->assertSee('"privacyMode":' . $input, false)
                ->assertSee('"serverQuickActions":' . $input, false);
        }
    }

    public function testInvalidSettingsAreRejectedAndOmittedFlagsArePreserved(): void
    {
        $this->actingAs(User::factory()->create(['root_admin' => true]));
        $this->patchJson('/admin/settings', $this->payload('false'))->assertRedirect();
        $this->patchJson('/admin/settings', $this->payload('yes'))->assertUnprocessable();
        $this->patchJson('/admin/settings', array_intersect_key($this->payload(), array_flip(['app:name', 'app:locale', 'pterodactyl:auth:2fa_required'])))->assertRedirect();
        foreach (self::FEATURES as $feature) {
            $this->assertDatabaseHas('settings', ['key' => 'settings::aquadactyl:features:' . $feature, 'value' => 'false']);
        }
    }

    public function testLogoPreservesProportionsAndTransparencyAndStripsEmbeddedContent(): void
    {
        $image = imagecreatetruecolor(3000, 1500);
        imagealphablending($image, false);
        imagesavealpha($image, true);
        imagefill($image, 0, 0, imagecolorallocatealpha($image, 0, 0, 0, 127));
        ob_start();
        imagepng($image);
        $file = UploadedFile::fake()->createWithContent('logo.png', ob_get_clean() . '<?php echo "payload"; ?>');
        $this->actingAs(User::factory()->create(['root_admin' => true]))->post('/admin/settings/logo', ['logo' => $file])->assertRedirect();
        $path = Setting::query()->where('key', SiteLogoService::SETTING)->value('value');
        $contents = Storage::disk('public')->get($path);
        $size = getimagesizefromstring($contents);
        $this->assertSame([1200, 600, IMAGETYPE_PNG], [$size[0], $size[1], $size[2]]);
        $decoded = imagecreatefromstring($contents);
        $this->assertSame(127, imagecolorsforindex($decoded, imagecolorat($decoded, 0, 0))['alpha']);
        $this->assertStringNotContainsString('<?php', $contents);
        $this->reloadSettings();
        $this->get('/admin/settings')->assertOk()->assertSee('/storage/' . $path, false);
        $this->get('/')->assertOk()->assertSee('branding\\/', false);
    }

    public function testSiteNameCanBeShownBesideACustomLogoAndOmittedSettingsArePreserved(): void
    {
        $this->actingAs(User::factory()->create(['root_admin' => true]));
        $this->patchJson('/admin/settings', $this->payload())->assertRedirect();
        $this->post('/admin/settings/logo', ['logo' => UploadedFile::fake()->image('logo.png')])->assertRedirect();
        $this->reloadSettings();
        $this->get('/admin/settings')->assertOk()->assertSee('<span class="custom-site-name" title="Test Site">Test Site</span>', false);
        $payload = $this->payload();
        unset($payload['aquadactyl:branding:show_name']);
        $this->patchJson('/admin/settings', $payload)->assertRedirect();
        $this->reloadSettings();
        $this->assertTrue(config('aquadactyl.branding.show_name'));
        $this->patchJson('/admin/settings', $this->payload('false'))->assertRedirect();
        $this->reloadSettings();
        $this->get('/admin/settings')->assertOk()->assertDontSee('class="custom-site-name"', false);
        $this->assertNotEmpty(config('aquadactyl.branding.logo_path'));
        $this->patchJson('/admin/settings', array_merge($payload, ['aquadactyl:branding:show_name' => 'yes']))->assertUnprocessable();
    }

    public function testReplacingAndRemovingTheLogoCleansUpOldFiles(): void
    {
        $this->actingAs(User::factory()->create(['root_admin' => true]));
        $this->post('/admin/settings/logo', ['logo' => UploadedFile::fake()->image('first.png', 80, 160)])->assertRedirect();
        $first = Setting::query()->where('key', SiteLogoService::SETTING)->value('value');
        $size = getimagesizefromstring(Storage::disk('public')->get($first));
        $this->assertSame([80, 160], [$size[0], $size[1]]);
        $this->post('/admin/settings/logo', ['logo' => UploadedFile::fake()->image('second.jpg')])->assertRedirect();
        $second = Setting::query()->where('key', SiteLogoService::SETTING)->value('value');
        $this->assertNotSame($first, $second);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);
        $this->delete('/admin/settings/logo')->assertRedirect();
        Storage::disk('public')->assertMissing($second);
        $this->reloadSettings();
        $this->assertEmpty(config('aquadactyl.branding.logo_path'));
    }

    public function testInvalidLogoUploadsLeaveTheExistingLogoUntouched(): void
    {
        $this->actingAs(User::factory()->create(['root_admin' => true]));
        $this->post('/admin/settings/logo', ['logo' => UploadedFile::fake()->image('logo.png')])->assertRedirect();
        $path = Setting::query()->where('key', SiteLogoService::SETTING)->value('value');
        foreach ([
            UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
            UploadedFile::fake()->createWithContent('logo.png', 'not an image'),
            UploadedFile::fake()->image('large.png')->size(2049),
            UploadedFile::fake()->image('wide.png', 4097, 1),
        ] as $file) {
            $this->post('/admin/settings/logo', ['logo' => $file])->assertUnprocessable();
            $this->assertSame($path, Setting::query()->where('key', SiteLogoService::SETTING)->value('value'));
        }
        $this->assertSame([$path], Storage::disk('public')->allFiles('branding'));
    }

    public function testDisabledPersonalizationIsEnforcedAndSavedChoicesReturnWhenEnabled(): void
    {
        $user = User::factory()->create(['root_admin' => true]);
        $this->actingAs($user)->post('/api/client/account/avatar', ['avatar' => UploadedFile::fake()->image('avatar.png')])->assertOk();
        $path = $user->refresh()->avatar;
        $user->forceFill(['blur_sensitive_data' => true])->save();
        config()->set('aquadactyl.features.custom_profile_pictures', false);
        config()->set('aquadactyl.features.privacy_mode', false);
        $this->post('/api/client/account/avatar', ['avatar' => UploadedFile::fake()->image('new.png')])->assertForbidden();
        $this->putJson('/api/client/account/privacy', ['blur_sensitive_data' => false])->assertForbidden();
        $this->getJson('/api/client/account')->assertOk()->assertJsonPath('attributes.avatar_url', null)
            ->assertJsonPath('attributes.blur_sensitive_data', false);
        $this->actingAs($user, 'web')->get('/account')->assertOk()->assertSee('<html class="">', false)->assertDontSee('/storage/' . $path, false);
        $this->get('/admin/users')->assertOk()->assertSee('<html class="">', false)->assertDontSee('/storage/' . $path, false);
        $this->assertFalse($user->toVueObject()['blur_sensitive_data']);
        $this->assertSame($path, $user->refresh()->avatar);
        $this->assertTrue($user->blur_sensitive_data);
        Storage::disk('public')->assertExists($path);
        config()->set('aquadactyl.features.custom_profile_pictures', true);
        config()->set('aquadactyl.features.privacy_mode', true);
        $this->getJson('/api/client/account')->assertOk()->assertJsonPath('attributes.avatar_url', '/storage/' . $path)
            ->assertJsonPath('attributes.blur_sensitive_data', true);
    }
}
