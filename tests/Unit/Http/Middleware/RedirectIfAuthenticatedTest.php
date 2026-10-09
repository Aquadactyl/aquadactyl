<?php

use Mockery as m;
use Illuminate\Auth\AuthManager;
use Illuminate\Http\RedirectResponse;
use Pterodactyl\Http\Middleware\RedirectIfAuthenticated;

beforeEach(function () {
    $this->authManager = m::mock(AuthManager::class);
});

test('authenticated user is redirected', function () {
    $this->authManager->shouldReceive('guard')->with(null)->once()->andReturnSelf();
    $this->authManager->shouldReceive('check')->withNoArgs()->once()->andReturn(true);

    $response = (new RedirectIfAuthenticated($this->authManager))->handle($this->request, $this->getClosureAssertions());

    expect($response)->toBeInstanceOf(RedirectResponse::class)
        ->and($response->getTargetUrl())->toBe(route('index'));
});

test('non authenticated user is not redirected', function () {
    $this->authManager->shouldReceive('guard')->with(null)->once()->andReturnSelf();
    $this->authManager->shouldReceive('check')->withNoArgs()->once()->andReturn(false);

    (new RedirectIfAuthenticated($this->authManager))->handle($this->request, $this->getClosureAssertions());
});
