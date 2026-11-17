<?php

use Illuminate\Http\Request;
use Pterodactyl\Http\Middleware\DemoMode;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

test('demo reset returns a retryable response while daemon callbacks remain authenticated downstream', function () {
    $marker = tempnam(sys_get_temp_dir(), 'aquadactyl-demo-reset-test-');
    config(['aquadactyl.demo.enabled' => true, 'aquadactyl.demo.reset_marker' => $marker]);
    try {
        $middleware = new DemoMode();
        try {
            $middleware->handle(Request::create('/'), fn () => new Response('not ready'));
            test()->fail('The demo must not serve requests during database restoration.');
        } catch (HttpException $exception) {
            expect($exception->getStatusCode())->toBe(503)->and($exception->getHeaders())->toBe(['Retry-After' => '5']);
        }
        $response = $middleware->handle(Request::create('/api/remote/servers', 'POST'), fn () => new Response('daemon middleware still runs'));
        expect($response->getContent())->toBe('daemon middleware still runs');
    } finally {
        unlink($marker);
    }
});

test('normal installations are unaffected by demo restrictions', function () {
    config()->set('aquadactyl.demo.enabled', false);
    $response = (new DemoMode())->handle(Request::create('/admin/nodes/new', 'POST'), fn () => new Response('normal'));
    expect($response->getContent())->toBe('normal')->and($response->headers->has('X-Aquadactyl-Demo'))->toBeFalse();
});

test('public demo permits only its bounded interactions', function (string $method, string $path, ?string $content = null) {
    config()->set('aquadactyl.demo.enabled', true);
    $request = Request::create($path, $method, [], [], [], [], $content);
    $response = (new DemoMode())->handle($request, fn () => new Response('allowed'));
    expect($response->getContent())->toBe('allowed')->and($response->headers->get('X-Aquadactyl-Demo'))->toBe('true');
})->with([
    ['GET', '/auth/login'], ['HEAD', '/'], ['GET', '/admin/settings/oauth'],
    ['GET', '/admin/nodes/view/1'], ['GET', '/admin/extensions'],
    ['GET', '/api/client/servers/demo/files/contents?file=server.py'],
    ['POST', '/auth/login'], ['POST', '/auth/logout'],
    ['POST', '/api/client/servers/demo/power'], ['POST', '/api/client/servers/demo/command'],
    ['POST', '/api/client/account/server-folders'], ['PUT', '/api/client/account/server-folders/servers/demo'],
    ['POST', '/api/client/servers/demo/files/write?file=%2Fwelcome.txt', 'notes'],
    ['POST', '/api/remote/servers/demo/install'],
]);

test('public demo blocks account takeover, code uploads and infrastructure changes', function (string $method, string $path, ?string $content = null) {
    config()->set('aquadactyl.demo.enabled', true);
    $request = Request::create($path, $method, [], [], [], [], $content);
    expect(fn () => (new DemoMode())->handle($request, fn () => new Response('unsafe')))->toThrow(HttpException::class);
})->with([
    ['POST', '/admin/nodes/new'], ['PATCH', '/admin/nodes/view/1/settings'],
    ['POST', '/admin/extensions/install'], ['POST', '/admin/settings'],
    ['GET', '/admin/nodes/view/1/configuration'], ['GET', '/admin/nodes/view/1/configuration/'],
    ['GET', '/admin/nodes/view/1/%63onfiguration'], ['GET', '/admin/settings/logs/download/private.log'],
    ['GET', 'http://localhost//admin//nodes/view/1/configuration'],
    ['GET', '/admin/extensions/blueprint'], ['GET', '/admin/blueprint/execute'],
    ['GET', '/api/application/nodes/1/configuration'], ['POST', '/api/application/users'],
    ['GET', '/api/client/account/api-keys'], ['GET', '/api/client/account/ssh-keys'],
    ['PUT', '/api/client/account/password'], ['PUT', '/api/client/account/email'],
    ['POST', '/api/client/account/two-factor'], ['POST', '/auth/password'],
    ['GET', '/api/client/servers/demo/files/upload'], ['POST', '/api/client/servers/demo/settings/reinstall'],
    ['POST', '/api/client/servers/demo/files/write?file=server.py', 'bad'],
    ['POST', '/api/client/servers/demo/files/write?file=%2F..%2Fserver.py', 'bad'],
    ['POST', '/api/client/servers/demo/files/write?file=%2Fwelcome.txt', str_repeat('x', 65537)],
    ['POST', '/api/client/servers/demo/files/pull'], ['PUT', '/api/client/servers/demo/startup/variable'],
]);
