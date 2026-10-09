<?php

use Pterodactyl\Models\User;
use Pterodactyl\Http\Middleware\AdminAuthenticate;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

test('admins are authenticated', function () {
    $user = User::factory()->make(['root_admin' => 1]);

    $this->request->shouldReceive('user')->withNoArgs()->twice()->andReturn($user);

    (new AdminAuthenticate())->handle($this->request, $this->getClosureAssertions());
});

test('exception is thrown if user does not exist', function () {
    $this->request->shouldReceive('user')->withNoArgs()->once()->andReturnNull();

    (new AdminAuthenticate())->handle($this->request, $this->getClosureAssertions());
})->throws(AccessDeniedHttpException::class);

test('exception is thrown if user is not an admin', function () {
    $user = User::factory()->make(['root_admin' => 0]);

    $this->request->shouldReceive('user')->withNoArgs()->twice()->andReturn($user);

    (new AdminAuthenticate())->handle($this->request, $this->getClosureAssertions());
})->throws(AccessDeniedHttpException::class);
