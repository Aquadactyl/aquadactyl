<?php

use Mockery as m;
use Pterodactyl\Models\User;
use Illuminate\Foundation\Application;
use Pterodactyl\Http\Middleware\LanguageMiddleware;

beforeEach(function () {
    $this->appMock = m::mock(Application::class);
});

test('language is set for guest', function () {
    $this->request->shouldReceive('user')->withNoArgs()->andReturnNull();
    $this->appMock->shouldReceive('setLocale')->with('en')->once()->andReturnNull();

    (new LanguageMiddleware($this->appMock))->handle($this->request, $this->getClosureAssertions());
});

test('language is set with authenticated user', function () {
    $user = User::factory()->make(['language' => 'de']);

    $this->request->shouldReceive('user')->withNoArgs()->andReturn($user);
    $this->appMock->shouldReceive('setLocale')->with('de')->once()->andReturnNull();

    (new LanguageMiddleware($this->appMock))->handle($this->request, $this->getClosureAssertions());
});
