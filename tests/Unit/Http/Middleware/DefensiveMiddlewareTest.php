<?php

use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Illuminate\Routing\Route;
use Pterodactyl\Models\ApiKey;
use Pterodactyl\Models\Server;
use Pterodactyl\Http\Middleware\Api\IsValidJson;
use Pterodactyl\Http\Middleware\Admin\Servers\ServerInstalled;
use Pterodactyl\Http\Middleware\Api\Client\RequireClientApiKey;

test('malformed JSON is rejected before an API controller sees it', function () {
    $request = Request::create('/api/client', 'POST', server: ['CONTENT_TYPE' => 'application/json'], content: '{');
    expect(fn () => (new IsValidJson())->handle($request, fn () => 'unsafe'))->toThrow(Symfony\Component\HttpKernel\Exception\BadRequestHttpException::class, 'malformed');
});

test('application API credentials cannot be used as client credentials', function () {
    $user = User::factory()->make();
    $user->withAccessToken((new ApiKey())->forceFill(['key_type' => ApiKey::TYPE_APPLICATION]));
    $request = Request::create('/api/client');
    $request->setUserResolver(fn () => $user);
    expect(fn () => (new RequireClientApiKey())->handle($request, fn () => 'unsafe'))->toThrow(Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException::class);
});

test('administrative installation guards reject missing and unfinished server resources', function (bool $missing) {
    $request = Request::create('/admin/server');
    $route = new Route('GET', '/admin/server', fn () => null);
    $route->bind($request);
    $route->setParameter('server', $missing ? 'missing' : Server::factory()->make(['status' => Server::STATUS_INSTALLING]));
    $request->setRouteResolver(fn () => $route);
    expect(fn () => (new ServerInstalled())->handle($request, fn () => 'unsafe'))->toThrow($missing ? Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class : Symfony\Component\HttpKernel\Exception\HttpException::class);
})->with([true, false]);
