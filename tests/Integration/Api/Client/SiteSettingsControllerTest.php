<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Setting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Pterodactyl\Providers\SettingsServiceProvider;
use Pterodactyl\Services\Settings\SiteLogoService;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

const FEATURES = ['player_counts', 'custom_profile_pictures', 'privacy_mode', 'server_quick_actions'];

beforeEach(function () {
    Storage::fake('public');
    if (!defined('LARAVEL_START')) {
        define('LARAVEL_START', microtime(true));
    }
});

afterEach(function () {
    foreach (array_merge(['app:name', 'app:locale', 'pterodactyl:auth:2fa_required', 'aquadactyl:branding:logo_path', 'aquadactyl:branding:show_name'], array_map(fn ($feature) => 'aquadactyl:features:' . $feature, FEATURES)) as $key) {
        app(SettingsRepositoryInterface::class)->forget('settings::' . $key);
    }
});

$payload = function (string $enabled = 'true'): array {
    return array_merge([
        'app:name' => 'Test Site',
        'aquadactyl:branding:show_name' => $enabled,
        'app:locale' => 'en',
        'pterodactyl:auth:2fa_required' => '0',
    ], array_fill_keys(array_map(fn ($feature) => 'aquadactyl:features:' . $feature, FEATURES), $enabled));
};

$reloadSettings = function () {
    app()->call([new SettingsServiceProvider(app()), 'boot']);
};

test('only admins can change settings or upload and remove the logo', function () use ($payload) {
    $this->actingAs(User::factory()->create())->patchJson('/admin/settings', $payload())->assertForbidden();
    $this->post('/admin/settings/logo', ['logo' => UploadedFile::fake()->image('logo.png')])->assertForbidden();
    $this->deleteJson('/admin/settings/logo')->assertForbidden();
    expect(Storage::disk('public')->allFiles())->toBe([]);
    $this->assertDatabaseMissing('settings', ['key' => SiteLogoService::SETTING]);
});

test('feature settings persist as booleans and reach the client', function () use ($payload, $reloadSettings) {
    $this->actingAs(User::factory()->create(['root_admin' => true]));
    foreach (['false' => false, 'true' => true] as $input => $expected) {
        $this->patchJson('/admin/settings', $payload($input))->assertRedirect('/admin/settings');
        $reloadSettings();
        expect(config('aquadactyl.branding.show_name'))->toBe($expected);
        foreach (FEATURES as $feature) {
            $this->assertDatabaseHas('settings', ['key' => 'settings::aquadactyl:features:' . $feature, 'value' => $input]);
            expect(config('aquadactyl.features.' . $feature))->toBe($expected);
        }
        $this->get('/')->assertOk()->assertSee('"showNameWithLogo":' . $input, false)->assertSee('"playerCounts":' . $input, false)
            ->assertSee('"customProfilePictures":' . $input, false)
            ->assertSee('"privacyMode":' . $input, false)
            ->assertSee('"serverQuickActions":' . $input, false);
    }
});

test('invalid settings are rejected and omitted flags are preserved', function () use ($payload) {
    $this->actingAs(User::factory()->create(['root_admin' => true]));
    $this->patchJson('/admin/settings', $payload('false'))->assertRedirect();
    $this->patchJson('/admin/settings', $payload('yes'))->assertUnprocessable();
    $this->patchJson('/admin/settings', array_intersect_key($payload(), array_flip(['app:name', 'app:locale', 'pterodactyl:auth:2fa_required'])))->assertRedirect();
    foreach (FEATURES as $feature) {
        $this->assertDatabaseHas('settings', ['key' => 'settings::aquadactyl:features:' . $feature, 'value' => 'false']);
    }
});

test('logo preserves proportions and transparency and strips embedded content', function () use ($reloadSettings) {
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
    expect([$size[0], $size[1], $size[2]])->toBe([1200, 600, IMAGETYPE_PNG]);
    $decoded = imagecreatefromstring($contents);
    expect(imagecolorsforindex($decoded, imagecolorat($decoded, 0, 0))['alpha'])->toBe(127);
    expect($contents)->not->toContain('<?php');
    $reloadSettings();
    $this->get('/admin/settings')->assertOk()->assertSee('/storage/' . $path, false);
    $this->get('/')->assertOk()->assertSee('branding\\/', false);
});

test('site name can be shown beside a custom logo and omitted settings are preserved', function () use ($payload, $reloadSettings) {
    $this->actingAs(User::factory()->create(['root_admin' => true]));
    $this->patchJson('/admin/settings', $payload())->assertRedirect();
    $this->post('/admin/settings/logo', ['logo' => UploadedFile::fake()->image('logo.png')])->assertRedirect();
    $reloadSettings();
    $this->get('/admin/settings')->assertOk()->assertSee('<span class="custom-site-name" title="Test Site">Test Site</span>', false);
    $currentPayload = $payload();
    unset($currentPayload['aquadactyl:branding:show_name']);
    $this->patchJson('/admin/settings', $currentPayload)->assertRedirect();
    $reloadSettings();
    expect(config('aquadactyl.branding.show_name'))->toBeTrue();
    $this->patchJson('/admin/settings', $payload('false'))->assertRedirect();
    $reloadSettings();
    $this->get('/admin/settings')->assertOk()->assertDontSee('class="custom-site-name"', false);
    expect(config('aquadactyl.branding.logo_path'))->not->toBeEmpty();
    $this->patchJson('/admin/settings', array_merge($currentPayload, ['aquadactyl:branding:show_name' => 'yes']))->assertUnprocessable();
});

test('replacing and removing the logo cleans up old files', function () use ($reloadSettings) {
    $this->actingAs(User::factory()->create(['root_admin' => true]));
    $this->post('/admin/settings/logo', ['logo' => UploadedFile::fake()->image('first.png', 80, 160)])->assertRedirect();
    $first = Setting::query()->where('key', SiteLogoService::SETTING)->value('value');
    $size = getimagesizefromstring(Storage::disk('public')->get($first));
    expect([$size[0], $size[1]])->toBe([80, 160]);
    $this->post('/admin/settings/logo', ['logo' => UploadedFile::fake()->image('second.jpg')])->assertRedirect();
    $second = Setting::query()->where('key', SiteLogoService::SETTING)->value('value');
    expect($second)->not->toBe($first);
    Storage::disk('public')->assertMissing($first);
    Storage::disk('public')->assertExists($second);
    $this->delete('/admin/settings/logo')->assertRedirect();
    Storage::disk('public')->assertMissing($second);
    $reloadSettings();
    expect(config('aquadactyl.branding.logo_path'))->toBeEmpty();
});

test('invalid logo uploads leave the existing logo untouched', function () {
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
        expect(Setting::query()->where('key', SiteLogoService::SETTING)->value('value'))->toBe($path);
    }
    expect(Storage::disk('public')->allFiles('branding'))->toBe([$path]);
});

test('disabled personalization is enforced and saved choices return when enabled', function () {
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
    expect($user->toVueObject()['blur_sensitive_data'])->toBeFalse()
        ->and($user->refresh()->avatar)->toBe($path)
        ->and($user->blur_sensitive_data)->toBeTrue();
    Storage::disk('public')->assertExists($path);
    config()->set('aquadactyl.features.custom_profile_pictures', true);
    config()->set('aquadactyl.features.privacy_mode', true);
    $this->getJson('/api/client/account')->assertOk()->assertJsonPath('attributes.avatar_url', '/storage/' . $path)
        ->assertJsonPath('attributes.blur_sensitive_data', true);
});
