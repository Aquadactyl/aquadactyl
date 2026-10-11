<?php

use Mockery as m;
use Pterodactyl\Models\User;
use Illuminate\Foundation\Application;
use Pterodactyl\Http\Middleware\LanguageMiddleware;
use Pterodactyl\Services\Users\LanguageService;

beforeEach(function () {
    $this->appMock = m::mock(Application::class);
    $this->languages = m::mock(LanguageService::class);
    $this->request->shouldReceive('getLanguages')->andReturn(['fr-CA', 'en']);
});

test('language is set for guest', function () {
    $this->request->shouldReceive('user')->withNoArgs()->andReturnNull();
    $this->appMock->shouldReceive('setLocale')->with('en')->once()->andReturnNull();
    $this->languages->shouldReceive('resolve')->with(null, ['fr-CA', 'en'])->once()->andReturn('en');

    (new LanguageMiddleware($this->appMock, $this->languages))->handle($this->request, $this->getClosureAssertions());
});

test('language is set with authenticated user', function () {
    $user = User::factory()->make(['language' => 'de']);

    $this->request->shouldReceive('user')->withNoArgs()->andReturn($user);
    $this->appMock->shouldReceive('setLocale')->with('de')->once()->andReturnNull();
    $this->languages->shouldReceive('resolve')->with('de', ['fr-CA', 'en'])->once()->andReturn('de');

    (new LanguageMiddleware($this->appMock, $this->languages))->handle($this->request, $this->getClosureAssertions());
});
