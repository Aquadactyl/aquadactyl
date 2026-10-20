<?php

use GuzzleHttp\Client;
use GuzzleHttp\Middleware;
use GuzzleHttp\HandlerStack;
use Illuminate\Http\Request;
use GuzzleHttp\Psr7\Response;
use GuzzleHttp\Handler\MockHandler;
use Illuminate\Support\Facades\Event;
use Pterodactyl\Events\Auth\FailedCaptcha;
use Pterodactyl\Http\Middleware\VerifyReCaptcha;
use Symfony\Component\HttpKernel\Exception\HttpException;

test('disabled CAPTCHA never contacts a provider and allows the request', function () {
    config()->set('recaptcha.enabled', false);
    $client = Mockery::mock(Client::class);
    $client->shouldNotReceive('post');
    $middleware = new VerifyReCaptcha(app('events'), config(), $client);
    $request = Request::create('https://panel.example.test/auth/login', 'POST');
    expect($middleware->handle($request, fn ($value) => $value))->toBe($request);
});

test('explicitly disabling CAPTCHA domain verification accepts a different hostname', function () {
    config()->set('recaptcha', ['enabled' => true, 'domain' => 'https://captcha.example.test/verify', 'verify_domain' => false]);
    $request = Request::create('https://panel.example.test/auth/login', 'POST', ['g-recaptcha-response' => 'token']);
    $client = new Client(['handler' => HandlerStack::create(new MockHandler([new Response(200, [], '{"success":true,"hostname":"different.example.test"}')]))]);
    expect((new VerifyReCaptcha(app('events'), config(), $client))->handle($request, fn () => 'allowed'))->toBe('allowed');
});

test('CAPTCHA providers use the configured endpoint secret response and client address', function (string $provider, string $field) {
    Event::fake([FailedCaptcha::class]);
    config()->set('recaptcha', ['enabled' => true, 'provider' => $provider, 'endpoints' => [$provider => 'https://captcha.example.test/verify'], 'secret_key' => 'test-secret', 'verify_domain' => true]);
    $history = [];
    $stack = HandlerStack::create(new MockHandler([new Response(200, [], '{"success":true,"hostname":"panel.example.test"}')]));
    $stack->push(Middleware::history($history));
    $request = Request::create('https://panel.example.test/auth/login', 'POST', [$field => 'test-response'], [], [], ['REMOTE_ADDR' => '192.0.2.1']);
    $middleware = new VerifyReCaptcha(app('events'), config(), new Client(['handler' => $stack]));
    expect($middleware->handle($request, fn () => 'verified'))->toBe('verified');
    expect((string) $history[0]['request']->getUri())->toBe('https://captcha.example.test/verify');
    parse_str((string) $history[0]['request']->getBody(), $body);
    expect($body)->toBe(['secret' => 'test-secret', 'response' => 'test-response', 'remoteip' => '192.0.2.1']);
    Event::assertNotDispatched(FailedCaptcha::class);
})->with([['recaptcha', 'g-recaptcha-response'], ['hcaptcha', 'h-captcha-response'], ['turnstile', 'cf-turnstile-response']]);

test('missing rejected mismatched and malformed CAPTCHA responses fail closed', function (?string $token, string $body, int $status) {
    Event::fake([FailedCaptcha::class]);
    config()->set('recaptcha', ['enabled' => true, 'domain' => 'https://captcha.example.test/verify', 'verify_domain' => true, 'secret_key' => 'test-secret']);
    $client = new Client(['handler' => HandlerStack::create(new MockHandler([new Response($status, [], $body)])), 'http_errors' => false]);
    $request = Request::create('https://panel.example.test/auth/login', 'POST', ['g-recaptcha-response' => $token]);
    $middleware = new VerifyReCaptcha(app('events'), config(), $client);
    expect(fn () => $middleware->handle($request, fn () => throw new RuntimeException('must not authenticate')))->toThrow(HttpException::class, 'Failed to validate captcha data');
    Event::assertDispatched(FailedCaptcha::class);
})->with([[null, '', 200], ['token', '{"success":false}', 200], ['token', '{"success":true,"hostname":"attacker.example.test"}', 200], ['token', 'invalid json', 200], ['token', '', 503]]);

test('CAPTCHA hostname verification can be explicitly disabled for supported proxy deployments', function () {
    config()->set('recaptcha', ['enabled' => true, 'domain' => 'https://captcha.example.test/verify', 'verify_domain' => false]);
    $request = Request::create('https://panel.example.test/auth/login', 'POST', ['g-recaptcha-response' => 'token']);
    $middleware = new VerifyReCaptcha(app('events'), config(), new Client(['handler' => HandlerStack::create(new MockHandler([new Response(200, [], '{"success":true}')]))]));
    expect($middleware->handle($request, fn () => 'verified'))->toBe('verified');
});

test('CAPTCHA verification bounds network time and never follows a redirect containing credentials', function () {
    Event::fake([FailedCaptcha::class]);
    config()->set('recaptcha', ['enabled' => true, 'domain' => 'https://captcha.example.test/verify', 'secret_key' => 'test-secret']);
    $history = [];
    $stack = HandlerStack::create(new MockHandler([new Response(307, ['Location' => 'https://attacker.example/collect']), new Response(200, [], '{"success":true}')]));
    $stack->push(Middleware::history($history));
    $request = Request::create('https://panel.example.test/auth/login', 'POST', ['g-recaptcha-response' => 'test-response']);
    $middleware = new VerifyReCaptcha(app('events'), config(), new Client(['handler' => $stack]));
    expect(fn () => $middleware->handle($request, fn () => 'must not authenticate'))->toThrow(HttpException::class, 'Failed to validate captcha data.');
    expect($history)->toHaveCount(1)->and($history[0]['options']['timeout'])->toBe(8)->and($history[0]['options']['connect_timeout'])->toBe(3);
});

test('CAPTCHA network errors are rejected without exposing provider credentials', function () {
    Event::fake([FailedCaptcha::class]);
    config()->set('recaptcha', ['enabled' => true, 'domain' => 'https://captcha.example.test/verify', 'secret_key' => 'test-secret']);
    $client = new Client(['handler' => new MockHandler([new GuzzleHttp\Exception\ConnectException('private provider error with credentials', new GuzzleHttp\Psr7\Request('POST', 'https://captcha.example.test/verify'))])]);
    $request = Request::create('https://panel.example.test/auth/login', 'POST', ['g-recaptcha-response' => 'token']);
    expect(fn () => (new VerifyReCaptcha(app('events'), config(), $client))->handle($request, fn () => 'must not authenticate'))->toThrow(HttpException::class, 'Failed to validate captcha data.');
    Event::assertDispatched(FailedCaptcha::class);
});

test('malformed or oversized CAPTCHA tokens are rejected before contacting the provider', function ($token) {
    Event::fake([FailedCaptcha::class]);
    config()->set('recaptcha.enabled', true);
    $client = Mockery::mock(Client::class);
    $client->shouldNotReceive('post');
    $request = Request::create('/auth/login', 'POST', ['g-recaptcha-response' => $token]);
    expect(fn () => (new VerifyReCaptcha(app('events'), config(), $client))->handle($request, fn () => 'must not authenticate'))->toThrow(HttpException::class);
})->with([[['nested-token']], [str_repeat('x', 8193)]]);

test('CAPTCHA requires a boolean success and a valid hostname shape', function (string $body) {
    Event::fake([FailedCaptcha::class]);
    config()->set('recaptcha', ['enabled' => true, 'domain' => 'https://captcha.example.test/verify', 'verify_domain' => true]);
    $client = new Client(['handler' => new MockHandler([new Response(200, [], $body)])]);
    $request = Request::create('https://panel.example.test/auth/login', 'POST', ['g-recaptcha-response' => 'token']);
    expect(fn () => (new VerifyReCaptcha(app('events'), config(), $client))->handle($request, fn () => 'must not authenticate'))->toThrow(HttpException::class);
})->with(['{"success":"false","hostname":"panel.example.test"}', '{"success":1,"hostname":"panel.example.test"}', '{"success":true}', '{"success":true,"hostname":[]}']);
