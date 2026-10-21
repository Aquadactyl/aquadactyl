<?php

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Pterodactyl\Http\Middleware\PanelMaintenance;

test('maintenance permits administrators disabled mode and sign in endpoints', function (bool $enabled, ?bool $admin, string $url) {
    config()->set('aquadactyl.maintenance.enabled', $enabled);
    $request = Request::create($url);
    $request->setUserResolver(fn () => $admin === null ? null : (object) ['root_admin' => $admin]);
    expect((new PanelMaintenance())->handle($request, fn () => new Response('allowed'))->getContent())->toBe('allowed');
})->with([[false, null, '/'], [true, true, '/admin/settings'], [true, null, '/auth/login'], [true, false, '/auth/password/reset/secret'], [true, null, '/auth/oauth/discord/callback'], [true, null, '/locales/en/auth.json']]);

test('maintenance blocks normal users with a retryable response and escaped message', function (bool $json, ?bool $admin) {
    $this->mock(Pterodactyl\Services\Integrations\IntegrationSettings::class)->shouldReceive('statusEnabled')->andReturn(false);
    $this->mock(Pterodactyl\Services\Notifications\NotificationSettings::class)->shouldReceive('get')->andReturn(['enabled' => false, 'discord_enabled' => false]);
    config()->set(['aquadactyl.maintenance.enabled' => true, 'aquadactyl.maintenance.message' => '<script>alert(1)</script>']);
    $request = Request::create('/');
    $request->setUserResolver(fn () => $admin === null ? null : (object) ['root_admin' => $admin]);
    if ($json) {
        $request->headers->set('Accept', 'application/json');
    }
    $response = (new PanelMaintenance())->handle($request, fn () => new Response('allowed'));
    expect($response->getStatusCode())->toBe(503)->and($response->headers->get('Retry-After'))->toBe('60')
        ->and($response->headers->get('Cache-Control'))->toContain('no-store');
    if ($json) {
        expect(json_decode($response->getContent(), true)['errors'][0]['detail'])->toBe('<script>alert(1)</script>');
    } else {
        expect($response->getContent())->toContain('&lt;script&gt;')->not->toContain('<script>alert');
    }
})->with([[true, false], [false, null]]);

test('maintenance has a useful default message', function () {
    config()->set(['aquadactyl.maintenance.enabled' => true, 'aquadactyl.maintenance.message' => '']);
    $request = Request::create('/', server: ['HTTP_ACCEPT' => 'application/json']);
    expect((new PanelMaintenance())->handle($request, fn () => new Response())->getContent())->toContain('temporarily unavailable');
});
