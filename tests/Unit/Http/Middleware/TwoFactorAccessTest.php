<?php

use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Illuminate\Routing\Route;
use Prologue\Alerts\AlertsMessageBag;
use Pterodactyl\Http\Middleware\EnsureStatefulRequests;
use Pterodactyl\Exceptions\Http\TwoFactorAuthRequiredException;
use Pterodactyl\Http\Middleware\RequireTwoFactorAuthentication;

test('mandatory two-factor settings permit setup routes and block protected pages until configured', function (int $level, bool $admin, bool $enabled, string $path, bool $allowed) {
    config()->set('pterodactyl.auth.2fa_required', $level);
    $request = Request::create($path);
    $route = new Route('GET', $path, fn () => null);
    $route->name(str_starts_with($path, '/account') ? 'account.security' : 'protected');
    $request->setRouteResolver(fn () => $route);
    $request->setUserResolver(fn () => User::factory()->make(['root_admin' => $admin, 'use_totp' => $enabled]));
    $response = (new RequireTwoFactorAuthentication(app(AlertsMessageBag::class)))->handle($request, fn () => 'allowed');
    if ($allowed) {
        expect($response)->toBe('allowed');
    } else {
        expect($response->getTargetUrl())->toBe(url('/account'));
    }
})->with([[0, false, false, '/server', true], [1, false, false, '/server', true], [1, true, false, '/server', false], [2, false, true, '/server', true], [2, false, false, '/account/security', true], [2, false, false, '/auth/login', true]]);

test('mandatory two-factor settings return an API error instead of redirecting JSON clients', function () {
    config()->set('pterodactyl.auth.2fa_required', 2);
    $request = Request::create('/api/client');
    $route = new Route('GET', '/api/client', fn () => null);
    $route->name('api:client:index');
    $request->setRouteResolver(fn () => $route);
    $request->setUserResolver(fn () => User::factory()->make(['use_totp' => false]));
    expect(fn () => (new RequireTwoFactorAuthentication(app(AlertsMessageBag::class)))->handle($request, fn () => 'denied'))->toThrow(TwoFactorAuthRequiredException::class);
});

test('requests from a configured frontend origin are recognized as stateful', function () {
    config()->set('sanctum.stateful', ['panel.example.test']);
    $request = Request::create('/api/client', 'GET', [], [], [], ['HTTP_ORIGIN' => 'https://panel.example.test']);
    expect(EnsureStatefulRequests::fromFrontend($request))->toBeTrue();
});
