<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Setting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Pterodactyl\Providers\SettingsServiceProvider;
use Pterodactyl\Services\Settings\AppearanceService;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

beforeEach(function () {
    Storage::fake('public');
    config()->set('pterodactyl.load_environment_only', false);
    $this->admin = User::factory()->create(['root_admin' => true]);
    $this->appearance = ['primary_color' => '#a85cf4', 'login_layout' => 'split-right', 'login_logo_position' => 'opposite', 'login_translucency' => 20, 'login_blur' => 8, 'login_overlay' => 45, 'client_blur' => 4, 'client_overlay' => 80];
});

afterEach(function () {
    foreach (array_keys(config('aquadactyl.appearance')) as $key) {
        app(SettingsRepositoryInterface::class)->forget('settings::aquadactyl:appearance:' . $key);
    }
    foreach (['app:name', 'aquadactyl:branding:show_name', 'aquadactyl:branding:logo_path'] as $key) {
        app(SettingsRepositoryInterface::class)->forget('settings::' . $key);
    }
});

test('branding controls live in appearance and general saves preserve them', function () {
    $this->actingAs($this->admin)->get('/admin/settings/appearance')->assertOk()
        ->assertSee('id="site-name" form="appearance-settings"', false)->assertSee('id="site-logo"', false);
    $this->get('/admin/settings')->assertOk()->assertDontSee('id="site-name"', false)->assertDontSee('id="site-logo"', false);
    $this->patch('/admin/settings/appearance', [...$this->appearance, 'app:name' => 'Custom Panel', 'aquadactyl:branding:show_name' => 'true'])
        ->assertRedirect('/admin/settings/appearance');
    $this->patch('/admin/settings', ['app:locale' => 'en', 'pterodactyl:auth:2fa_required' => '0'])->assertRedirect('/admin/settings');
    app()->call([new SettingsServiceProvider(app()), 'boot']);
    expect(config('app.name'))->toBe('Custom Panel')->and(config('aquadactyl.branding.show_name'))->toBeTrue();
    $this->get('/')->assertOk()->assertSee('"name":"Custom Panel"', false)->assertSee('"showNameWithLogo":true', false);
});

test('invalid branding rejects the entire appearance update', function (array $branding) {
    $this->actingAs($this->admin)->patchJson('/admin/settings/appearance', [...$this->appearance, ...$branding])->assertUnprocessable();
    $this->assertDatabaseMissing('settings', ['key' => 'settings::aquadactyl:appearance:primary_color']);
})->with([[['app:name' => '']], [['app:name' => str_repeat('a', 192)]], [['aquadactyl:branding:show_name' => 'yes']]]);

test('image actions return fresh public URLs without submitting draft settings', function () {
    $this->actingAs($this->admin)->withHeaders(['Accept' => 'application/json', 'X-Requested-With' => 'XMLHttpRequest']);
    $response = $this->post('/admin/settings/logo', ['logo' => UploadedFile::fake()->image('logo.png')])->assertOk();
    $path = Setting::query()->where('key', 'settings::aquadactyl:branding:logo_path')->value('value');
    $response->assertJsonPath('url', '/storage/' . $path)->assertJsonStructure(['url', 'message']);
    $this->post('/admin/settings/appearance/background/login', ['background' => UploadedFile::fake()->image('bg.png')])->assertOk()
        ->assertJsonPath('url', '/storage/' . Setting::query()->where('key', 'settings::aquadactyl:appearance:login_background_path')->value('value'));
    $this->delete('/admin/settings/logo')->assertOk()->assertJsonPath('url', null);
    $this->delete('/admin/settings/appearance/background/login')->assertOk()->assertJsonPath('url', null);
    $this->assertDatabaseMissing('settings', ['key' => 'settings::app:name']);
    $this->assertDatabaseMissing('settings', ['key' => 'settings::aquadactyl:appearance:primary_color']);
    expect(Storage::disk('public')->allFiles())->toBe([]);
});

test('appearance and background writes require an administrator', function () {
    $this->actingAs(User::factory()->create())->get('/admin/settings/appearance')->assertForbidden();
    $this->patchJson('/admin/settings/appearance', $this->appearance)->assertForbidden();
    $this->post('/admin/settings/appearance/background/login', ['background' => UploadedFile::fake()->image('bg.png')])->assertForbidden();
    $this->delete('/admin/settings/appearance/background/client')->assertForbidden();
    expect(Storage::disk('public')->allFiles())->toBe([]);
});

test('appearance settings survive requests and reach client and admin styles', function () {
    $this->actingAs($this->admin)->patchJson('/admin/settings/appearance', $this->appearance)->assertRedirect('/admin/settings/appearance');
    app()->call([new SettingsServiceProvider(app()), 'boot']);
    expect(app(AppearanceService::class)->publicSettings())->toMatchArray([
        'primaryColor' => '#a85cf4', 'loginLayout' => 'split-right', 'loginLogoPosition' => 'opposite',
        'loginTranslucency' => 20,
        'loginBackground' => ['url' => null, 'blur' => 8, 'overlay' => 45],
        'clientBackground' => ['url' => null, 'blur' => 4, 'overlay' => 80],
    ]);
    $this->get('/')->assertOk()->assertSee('"loginLayout":"split-right"', false)->assertSee('--color-primary-500: #a85cf4;', false)->assertSee('--login-box-background: #1c232acc;', false);
    $this->get('/admin/settings/appearance')->assertOk()->assertSee('--aqua-primary: #a85cf4;', false);
});

test('invalid colours layouts and effects cannot alter saved appearance', function (string $key, mixed $value) {
    $this->actingAs($this->admin)->patchJson('/admin/settings/appearance', [...$this->appearance, $key => $value])->assertUnprocessable();
    $this->assertDatabaseMissing('settings', ['key' => 'settings::aquadactyl:appearance:primary_color']);
})->with([
    ['primary_color', 'red; background:url(https://invalid.test)'], ['primary_color', '#fff'],
    ['login_layout', 'unknown'], ['login_logo_position', 'unknown'], ['login_translucency', -1], ['login_translucency', 101], ['login_blur', 31], ['client_blur', -1], ['client_overlay', 96],
]);

test('backgrounds are reencoded resized and isolated by area', function () {
    $image = imagecreatetruecolor(3000, 1500);
    ob_start();
    imagepng($image);
    $file = UploadedFile::fake()->createWithContent('background.png', ob_get_clean() . '<?php echo "embedded"; ?>');
    $this->actingAs($this->admin)->post('/admin/settings/appearance/background/login', ['background' => $file])->assertRedirect('/admin/settings/appearance');
    $key = 'settings::aquadactyl:appearance:login_background_path';
    $first = Setting::query()->where('key', $key)->value('value');
    expect($first)->toStartWith('backgrounds/login/');
    $contents = Storage::disk('public')->get($first);
    $dimensions = getimagesizefromstring($contents);
    expect([$dimensions[0], $dimensions[1], $dimensions[2]])->toBe([2560, 1280, IMAGETYPE_PNG]);
    expect($contents)->not->toContain('<?php');
    $this->post('/admin/settings/appearance/background/client', ['background' => UploadedFile::fake()->image('client.png')])->assertRedirect();
    $client = Setting::query()->where('key', 'settings::aquadactyl:appearance:client_background_path')->value('value');
    $this->post('/admin/settings/appearance/background/login', ['background' => UploadedFile::fake()->image('second.png')])->assertRedirect();
    Storage::disk('public')->assertMissing($first);
    $current = Setting::query()->where('key', $key)->value('value');
    app()->call([new SettingsServiceProvider(app()), 'boot']);
    expect(app(AppearanceService::class)->publicSettings()['loginBackground']['url'])->toBe('/storage/' . $current);
    $this->delete('/admin/settings/appearance/background/login')->assertRedirect();
    Storage::disk('public')->assertMissing($current);
    Storage::disk('public')->assertExists($client);
    $this->assertDatabaseHas('settings', ['key' => $key, 'value' => '']);
});

test('unsafe backgrounds and unsupported areas are rejected', function () {
    $this->actingAs($this->admin)->post('/admin/settings/appearance/background/login', ['background' => UploadedFile::fake()->createWithContent('image.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>')])->assertUnprocessable();
    $this->post('/admin/settings/appearance/background/client', ['background' => UploadedFile::fake()->createWithContent('image.png', '<?php echo 1;')])->assertUnprocessable();
    $this->post('/admin/settings/appearance/background/login', ['background' => UploadedFile::fake()->image('wide.png', 4100, 1)])->assertUnprocessable();
    $this->post('/admin/settings/appearance/background/client', ['background' => UploadedFile::fake()->image('oversized.png')->size(8193)])->assertUnprocessable();
    $this->post('/admin/settings/appearance/background/other', ['background' => UploadedFile::fake()->image('image.png')])->assertNotFound();
    expect(Storage::disk('public')->allFiles())->toBe([]);
});

test('environment only mode prevents appearance uploads removals and saves', function () {
    config()->set('pterodactyl.load_environment_only', true);
    $this->actingAs($this->admin)->patchJson('/admin/settings/appearance', $this->appearance)->assertStatus(400);
    $this->post('/admin/settings/appearance/background/login', ['background' => UploadedFile::fake()->image('image.png')])->assertStatus(400);
    $this->delete('/admin/settings/appearance/background/client')->assertStatus(400);
    $this->post('/admin/settings/logo', ['logo' => UploadedFile::fake()->image('logo.png')])->assertStatus(400);
    $this->delete('/admin/settings/logo')->assertStatus(400);
    expect(Storage::disk('public')->allFiles())->toBe([]);
});

test('new appearance and mail settings render in each supported language', function (string $locale, string $heading) {
    $this->admin->update(['language' => $locale]);
    $this->actingAs($this->admin)->get('/admin/settings/appearance')->assertOk()->assertSee($heading)->assertDontSee('admin/custom.');
    $this->get('/admin/settings/mail')->assertOk()->assertDontSee('admin/custom.');
})->with([['en', 'Appearance'], ['fr', 'Apparence'], ['de', 'Erscheinungsbild']]);

test('palette keeps safe CSS and contrasting button text for light and dark colours', function () {
    foreach (['#000000' => '#ffffff', '#ffffff' => '#000000', '#ffff00' => '#000000', '#222266' => '#ffffff'] as $color => $text) {
        config()->set('aquadactyl.appearance.primary_color', $color);
        $palette = app(AppearanceService::class)->cssVariables();
        expect($palette['--color-primary-500'])->toBe($color)->and($palette['--color-primary-contrast'])->toBe($text);
        foreach ($palette as $value) {
            expect($value)->toMatch('/\A#[a-f0-9]{6}(?:[a-f0-9]{2})?\z/');
        }
    }
    config()->set('aquadactyl.appearance.primary_color', '<style>bad</style>');
    expect(app(AppearanceService::class)->primaryColor())->toBe(AppearanceService::DEFAULT_COLOR);
    expect(app(AppearanceService::class)->backgroundUrl('../secret.png', 'login'))->toBeNull();
});
