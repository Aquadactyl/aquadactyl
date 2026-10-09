<?php

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Pterodactyl\Http\Middleware\SetSecurityHeaders;

test('only authenticated admins can request a dashboard preview', function (string $uri, ?bool $admin, string $expected) {
    $request = Request::create($uri);
    $request->setUserResolver(fn () => is_null($admin) ? null : (object) ['root_admin' => $admin]);
    $response = (new SetSecurityHeaders())->handle($request, fn () => new Response('page'));

    expect($response->headers->get('X-Frame-Options'))->toBe($expected)
        ->and($response->headers->get('X-Content-Type-Options'))->toBe('nosniff');
})->with([
    ['/?theme-preview=1', true, 'SAMEORIGIN'],
    ['/?theme-preview=1', false, 'DENY'],
    ['/?theme-preview=1', null, 'DENY'],
    ['/', true, 'DENY'],
    ['/account?theme-preview=1', true, 'DENY'],
    ['/auth/login?theme-preview=1', true, 'DENY'],
    ['/?theme-preview=0', true, 'DENY'],
]);

test('an existing frame policy is preserved', function () {
    $request = Request::create('/?theme-preview=1');
    $request->setUserResolver(fn () => (object) ['root_admin' => true]);
    $response = (new SetSecurityHeaders())->handle($request, fn () => new Response('page', 200, ['X-Frame-Options' => 'DENY']));

    expect($response->headers->get('X-Frame-Options'))->toBe('DENY');
});
