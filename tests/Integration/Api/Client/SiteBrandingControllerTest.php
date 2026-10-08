<?php

namespace Pterodactyl\Tests\Integration\Api\Client;

use Pterodactyl\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Pterodactyl\Providers\SettingsServiceProvider;
use Pterodactyl\Services\Settings\SiteLogoService;
use Pterodactyl\Services\Settings\SiteBrandingService;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

class SiteBrandingControllerTest extends ClientApiIntegrationTestCase
{
    public function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Cache::flush();
        config()->set('app.name', 'Example Panel');
        if (!defined('LARAVEL_START')) {
            define('LARAVEL_START', microtime(true));
        }
    }

    protected function tearDown(): void
    {
        foreach (['app:name', 'app:locale', 'pterodactyl:auth:2fa_required', 'aquadactyl:branding:logo_path'] as $key) {
            app(SettingsRepositoryInterface::class)->forget('settings::' . $key);
        }

        parent::tearDown();
    }

    private function reloadSettings(): void
    {
        $this->app->call([new SettingsServiceProvider($this->app), 'boot']);
    }

    private function uploadLogo(int $width = 120, int $height = 60): void
    {
        $image = imagecreatetruecolor($width, $height);
        imagefill($image, 0, 0, imagecolorallocate($image, 255, 0, 0));
        ob_start();
        imagepng($image);
        app(SiteLogoService::class)->upload(UploadedFile::fake()->createWithContent('logo.png', ob_get_clean()));
        $this->reloadSettings();
    }

    public function testIconsAndShortcutMetadataArePublicAndUseTheConfiguredName(): void
    {
        foreach ([16, 32, 48, 70, 150, 180, 192, 256, 310, 512] as $size) {
            $response = $this->get('/branding/site/icons/' . $size . '.png')->assertOk()->assertHeader('Content-Type', 'image/png');
            $image = getimagesizefromstring($response->getContent());
            $this->assertSame([$size, $size, IMAGETYPE_PNG], [$image[0], $image[1], $image[2]]);
            $this->assertFalse($response->headers->has('Set-Cookie'));
        }
        foreach (['/branding/site/manifest.webmanifest', '/favicons/manifest.json'] as $path) {
            $this->get($path)->assertOk()->assertHeader('Content-Type', 'application/manifest+json')
                ->assertJsonPath('name', 'Example Panel')->assertJsonPath('short_name', 'Example Panel')
                ->assertJsonPath('icons.0.sizes', '192x192')->assertJsonPath('icons.1.sizes', '512x512');
        }
        $this->get('/branding/site/browserconfig.xml')->assertOk()->assertHeader('Content-Type', 'application/xml');
        $this->get('/favicons/browserconfig.xml')->assertOk()->assertSee('/branding/site/icons/150.png?v=', false);
        $this->get('/branding/site/mask-icon.svg')->assertOk()->assertHeader('Content-Type', 'image/svg+xml');
    }

    public function testWideAndTallLogosFitWithoutCroppingOrStretching(): void
    {
        foreach ([[120, 60], [60, 120]] as [$width, $height]) {
            $this->uploadLogo($width, $height);
            $response = $this->get('/branding/site/icons/32.png')->assertOk();
            $image = imagecreatefromstring($response->getContent());
            $center = imagecolorsforindex($image, imagecolorat($image, 16, 16));
            $corner = imagecolorsforindex($image, imagecolorat($image, 0, 0));
            $this->assertSame(['red' => 255, 'green' => 0, 'blue' => 0, 'alpha' => 0], $center);
            $this->assertSame(127, $corner['alpha']);
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
            $this->assertSame($width > $height ? [32, 16] : [16, 32], [$maxX - $minX + 1, $maxY - $minY + 1]);
        }
    }

    public function testFaviconContainsThreeValidPngFramesAndAliasesMatch(): void
    {
        $this->uploadLogo();
        $contents = $this->get('/branding/site/favicon.ico')->assertOk()->assertHeader('Content-Type', 'image/vnd.microsoft.icon')->getContent();
        $this->assertSame(['reserved' => 0, 'type' => 1, 'count' => 3], unpack('vreserved/vtype/vcount', substr($contents, 0, 6)));
        foreach ([16, 32, 48] as $index => $size) {
            $entry = unpack('Cwidth/Cheight/Ccolors/Creserved/vplanes/vdepth/Vlength/Voffset', substr($contents, 6 + 16 * $index, 16));
            $this->assertSame([$size, $size, 1, 32], [$entry['width'], $entry['height'], $entry['planes'], $entry['depth']]);
            $png = substr($contents, $entry['offset'], $entry['length']);
            $image = getimagesizefromstring($png);
            $this->assertSame([$size, $size, IMAGETYPE_PNG], [$image[0], $image[1], $image[2]]);
        }
        $this->assertSame($contents, $this->get('/favicon.ico')->assertOk()->getContent());
        $this->assertSame($contents, $this->get('/favicons/favicon.ico')->assertOk()->getContent());
    }

    public function testPinnedTabMaskTracesTheLogoAsBlackVectors(): void
    {
        $this->uploadLogo();
        $contents = $this->get('/branding/site/mask-icon.svg')->assertOk()->getContent();
        $svg = simplexml_load_string($contents);
        $this->assertSame('0 0 16 16', (string) $svg['viewBox']);
        $this->assertSame('#000', (string) $svg->path['fill']);
        $this->assertSame('scale(0.0625)', (string) $svg->path['transform']);
        $this->assertStringContainsString('M0 64h256v1H0z', (string) $svg->path['d']);
        $this->assertStringNotContainsString('<image', $contents);
    }

    public function testChangingNameAndLogoUpdatesAllLayoutsAndVersions(): void
    {
        $branding = app(SiteBrandingService::class);
        $original = $branding->version();
        $admin = User::factory()->create(['root_admin' => true]);
        $this->actingAs($admin)->patchJson('/admin/settings', [
            'app:name' => 'New & Improved Panel',
            'app:locale' => 'en',
            'pterodactyl:auth:2fa_required' => '0',
        ])->assertRedirect();
        $this->reloadSettings();
        $renamed = $branding->version();
        $this->assertNotSame($original, $renamed);
        $this->get('/favicons/manifest.json')->assertOk()->assertJsonPath('name', 'New & Improved Panel');
        foreach (['/account', '/admin/settings'] as $path) {
            $this->get($path)->assertOk()->assertSee('content="New &amp; Improved Panel"', false)
                ->assertSee('/branding/site/icons/32.png?v=' . $renamed, false);
        }
        $this->uploadLogo();
        $this->assertNotSame($renamed, $branding->version());
        $this->get('/account')->assertOk()->assertSee('/branding/site/icons/32.png?v=' . $branding->version(), false);
        auth()->forgetGuards();
        $this->get('/auth/login')->assertOk()->assertSee('content="New &amp; Improved Panel"', false)
            ->assertSee('/branding/site/icons/32.png?v=' . $branding->version(), false);
    }

    public function testReplacingAndResettingALogoNeverReturnsStaleCachedIcons(): void
    {
        $original = $this->get('/branding/site/icons/32.png')->assertOk()->getContent();
        $this->uploadLogo();
        $wide = $this->get('/branding/site/icons/32.png')->assertOk()->getContent();
        $this->assertNotSame($original, $wide);
        $this->uploadLogo(60, 120);
        $tall = $this->get('/branding/site/icons/32.png')->assertOk()->getContent();
        $this->assertNotSame($wide, $tall);
        app(SiteLogoService::class)->remove();
        $this->reloadSettings();
        $this->assertSame($original, $this->get('/branding/site/icons/32.png')->assertOk()->getContent());
    }

    public function testMissingUploadsFallBackToDefaultIconsAndUnknownSizesAreRejected(): void
    {
        $original = $this->get('/branding/site/icons/32.png')->assertOk()->getContent();
        config()->set('aquadactyl.branding.logo_path', 'branding/00000000-0000-0000-0000-000000000000.png');
        $this->assertSame($original, $this->get('/branding/site/icons/32.png')->assertOk()->getContent());
        foreach (['0', '4096', '-1', 'invalid'] as $size) {
            $this->get('/branding/site/icons/' . $size . '.png')->assertNotFound();
        }
    }

    public function testConditionalRequestsRevalidateAfterBrandingChanges(): void
    {
        $path = '/branding/site/manifest.webmanifest';
        $response = $this->get($path)->assertOk();
        $etag = $response->headers->get('ETag');
        $this->get($path, ['If-None-Match' => $etag])->assertStatus(304)->assertContent('');
        config()->set('app.name', 'Renamed Panel');
        $changed = $this->get($path, ['If-None-Match' => $etag])->assertOk()->assertJsonPath('name', 'Renamed Panel');
        $this->assertNotSame($etag, $changed->headers->get('ETag'));
    }
}
