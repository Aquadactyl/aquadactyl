<?php

use Pterodactyl\Services\Settings\SiteBrandingService;

test('the service worker is public sessionless and updates whenever branding changes', function () {
    $first = $this->get('/pwa/service-worker')->assertOk()->assertHeader('Service-Worker-Allowed', '/')
        ->assertHeader('Content-Type', 'application/javascript; charset=UTF-8');
    expect($first->headers->get('Cache-Control'))->toContain('no-store');
    expect($first->headers->has('Set-Cookie'))->toBeFalse();
    expect($first->getContent())->toContain('";' . PHP_EOL)->not->toContain('";\\n');
    config()->set('app.name', 'Updated PWA');
    $second = $this->get('/pwa/service-worker')->assertOk();
    expect($second->getContent())->not->toBe($first->getContent());
    $version = app(SiteBrandingService::class)->version();
    config()->set('aquadactyl.appearance.primary_color', '#a85cf4');
    expect(app(SiteBrandingService::class)->version())->not->toBe($version);
    $this->get('/branding/site/manifest.webmanifest')->assertOk()->assertJsonPath('theme_color', '#a85cf4')
        ->assertJsonPath('display', 'standalone')->assertJsonPath('scope', '/')->assertJsonPath('id', '/');
});

test('offline pages are public translated escaped and contain no account data', function (string $locale, string $heading) {
    config()->set('app.name', '</script><img src=x onerror=alert(1)>');
    $response = $this->get('/pwa/offline?lang=' . $locale)->assertOk()->assertSee($heading)
        ->assertDontSee('<img src=x onerror=alert(1)>', false)->assertDontSee('window.PterodactylUser')->assertDontSee('csrf-token');
    expect($response->headers->has('Set-Cookie'))->toBeFalse();
})->with([['en', 'You are offline'], ['fr', 'Vous êtes hors ligne'], ['de', 'Du bist offline'], ['invalid', 'You are offline']]);
