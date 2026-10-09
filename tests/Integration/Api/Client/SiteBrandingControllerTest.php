<?php

use Pterodactyl\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Pterodactyl\Providers\SettingsServiceProvider;
use Pterodactyl\Services\Settings\SiteLogoService;
use Pterodactyl\Services\Settings\SiteBrandingService;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

beforeEach(function () {
    Storage::fake('public');
    Cache::flush();
    config()->set('app.name', 'Example Panel');
    if (!defined('LARAVEL_START')) {
        define('LARAVEL_START', microtime(true));
    }
});

afterEach(function () {
    foreach (['app:name', 'app:locale', 'pterodactyl:auth:2fa_required', 'aquadactyl:branding:logo_path'] as $key) {
        app(SettingsRepositoryInterface::class)->forget('settings::' . $key);
    }
});

$reloadSettings = function () {
    app()->call([new SettingsServiceProvider(app()), 'boot']);
};

$uploadLogo = function (int $width = 120, int $height = 60) use ($reloadSettings) {
    $image = imagecreatetruecolor($width, $height);
    imagefill($image, 0, 0, imagecolorallocate($image, 255, 0, 0));
    ob_start();
    imagepng($image);
    app(SiteLogoService::class)->upload(UploadedFile::fake()->createWithContent('logo.png', ob_get_clean()));
    $reloadSettings();
};

test('icons and shortcut metadata are public and use the configured name', function () {
    foreach ([16, 32, 48, 70, 150, 180, 192, 256, 310, 512] as $size) {
        $response = $this->get('/branding/site/icons/' . $size . '.png')->assertOk()->assertHeader('Content-Type', 'image/png');
        $image = getimagesizefromstring($response->getContent());
        expect([$image[0], $image[1], $image[2]])->toBe([$size, $size, IMAGETYPE_PNG])
            ->and($response->headers->has('Set-Cookie'))->toBeFalse();
    }
    foreach (['/branding/site/manifest.webmanifest', '/favicons/manifest.json'] as $path) {
        $this->get($path)->assertOk()->assertHeader('Content-Type', 'application/manifest+json')
            ->assertJsonPath('name', 'Example Panel')->assertJsonPath('short_name', 'Example Panel')
            ->assertJsonPath('icons.0.sizes', '192x192')->assertJsonPath('icons.1.sizes', '512x512');
    }
    $this->get('/branding/site/browserconfig.xml')->assertOk()->assertHeader('Content-Type', 'application/xml');
    $this->get('/favicons/browserconfig.xml')->assertOk()->assertSee('/branding/site/icons/150.png?v=', false);
    $this->get('/branding/site/mask-icon.svg')->assertOk()->assertHeader('Content-Type', 'image/svg+xml');
});

test('wide and tall logos fit without cropping or stretching', function () use ($uploadLogo) {
    foreach ([[120, 60], [60, 120]] as [$width, $height]) {
        $uploadLogo($width, $height);
        $response = $this->get('/branding/site/icons/32.png')->assertOk();
        $image = imagecreatefromstring($response->getContent());
        $center = imagecolorsforindex($image, imagecolorat($image, 16, 16));
        $corner = imagecolorsforindex($image, imagecolorat($image, 0, 0));
        expect($center)->toBe(['red' => 255, 'green' => 0, 'blue' => 0, 'alpha' => 0])
            ->and($corner['alpha'])->toBe(127);
        $minX = $minY = 32;
        $maxX = $maxY = 0;
        for ($y = 0; $y < 32; ++$y) {
            for ($x = 0; $x < 32; ++$x) {
                if (imagecolorsforindex($image, imagecolorat($image, $x, $y))['alpha'] === 0) {
                    $minX = min($minX, $x);
                    $maxX = max($maxX, $x);
                    $minY = min($minY, $y);
                    $maxY = max($maxY, $y);
                }
            }
        }
        expect([$maxX - $minX + 1, $maxY - $minY + 1])->toBe($width > $height ? [32, 16] : [16, 32]);
    }
});

test('favicon contains three valid png frames and aliases match', function () use ($uploadLogo) {
    $uploadLogo();
    $contents = $this->get('/branding/site/favicon.ico')->assertOk()->assertHeader('Content-Type', 'image/vnd.microsoft.icon')->getContent();
    expect(unpack('vreserved/vtype/vcount', substr($contents, 0, 6)))->toBe(['reserved' => 0, 'type' => 1, 'count' => 3]);
    foreach ([16, 32, 48] as $index => $size) {
        $entry = unpack('Cwidth/Cheight/Ccolors/Creserved/vplanes/vdepth/Vlength/Voffset', substr($contents, 6 + 16 * $index, 16));
        expect([$entry['width'], $entry['height'], $entry['planes'], $entry['depth']])->toBe([$size, $size, 1, 32]);
        $png = substr($contents, $entry['offset'], $entry['length']);
        $image = getimagesizefromstring($png);
        expect([$image[0], $image[1], $image[2]])->toBe([$size, $size, IMAGETYPE_PNG]);
    }
    expect($this->get('/favicon.ico')->assertOk()->getContent())->toBe($contents)
        ->and($this->get('/favicons/favicon.ico')->assertOk()->getContent())->toBe($contents);
});

test('pinned tab mask traces the logo as black vectors', function () use ($uploadLogo) {
    $uploadLogo();
    $contents = $this->get('/branding/site/mask-icon.svg')->assertOk()->getContent();
    $svg = simplexml_load_string($contents);
    expect((string) $svg['viewBox'])->toBe('0 0 16 16')
        ->and((string) $svg->path['fill'])->toBe('#000')
        ->and((string) $svg->path['transform'])->toBe('scale(0.0625)')
        ->and((string) $svg->path['d'])->toContain('M0 64h256v1H0z');
    expect($contents)->not->toContain('<image');
});

test('changing name and logo updates all layouts and versions', function () use ($uploadLogo, $reloadSettings) {
    $branding = app(SiteBrandingService::class);
    $original = $branding->version();
    $admin = User::factory()->create(['root_admin' => true]);
    $this->actingAs($admin)->patchJson('/admin/settings', [
        'app:name' => 'New & Improved Panel',
        'app:locale' => 'en',
        'pterodactyl:auth:2fa_required' => '0',
    ])->assertRedirect();
    $reloadSettings();
    $renamed = $branding->version();
    expect($renamed)->not->toBe($original);
    $this->get('/favicons/manifest.json')->assertOk()->assertJsonPath('name', 'New & Improved Panel');
    foreach (['/account', '/admin/settings'] as $path) {
        $this->get($path)->assertOk()->assertSee('content="New &amp; Improved Panel"', false)
            ->assertSee('/branding/site/icons/32.png?v=' . $renamed, false);
    }
    $uploadLogo();
    expect($branding->version())->not->toBe($renamed);
    $this->get('/account')->assertOk()->assertSee('/branding/site/icons/32.png?v=' . $branding->version(), false);
    auth()->forgetGuards();
    $this->get('/auth/login')->assertOk()->assertSee('content="New &amp; Improved Panel"', false)
        ->assertSee('/branding/site/icons/32.png?v=' . $branding->version(), false);
});

test('replacing and resetting a logo never returns stale cached icons', function () use ($uploadLogo, $reloadSettings) {
    $original = $this->get('/branding/site/icons/32.png')->assertOk()->getContent();
    $uploadLogo();
    $wide = $this->get('/branding/site/icons/32.png')->assertOk()->getContent();
    expect($wide)->not->toBe($original);
    $uploadLogo(60, 120);
    $tall = $this->get('/branding/site/icons/32.png')->assertOk()->getContent();
    expect($tall)->not->toBe($wide);
    app(SiteLogoService::class)->remove();
    $reloadSettings();
    expect($this->get('/branding/site/icons/32.png')->assertOk()->getContent())->toBe($original);
});

test('missing uploads fall back to default icons and unknown sizes are rejected', function () {
    $original = $this->get('/branding/site/icons/32.png')->assertOk()->getContent();
    config()->set('aquadactyl.branding.logo_path', 'branding/00000000-0000-0000-0000-000000000000.png');
    expect($this->get('/branding/site/icons/32.png')->assertOk()->getContent())->toBe($original);
    foreach (['0', '4096', '-1', 'invalid'] as $size) {
        $this->get('/branding/site/icons/' . $size . '.png')->assertNotFound();
    }
});

test('conditional requests revalidate after branding changes', function () {
    $path = '/branding/site/manifest.webmanifest';
    $response = $this->get($path)->assertOk();
    $etag = $response->headers->get('ETag');
    $this->get($path, ['If-None-Match' => $etag])->assertStatus(304)->assertContent('');
    config()->set('app.name', 'Renamed Panel');
    $changed = $this->get($path, ['If-None-Match' => $etag])->assertOk()->assertJsonPath('name', 'Renamed Panel');
    expect($changed->headers->get('ETag'))->not->toBe($etag);
});
