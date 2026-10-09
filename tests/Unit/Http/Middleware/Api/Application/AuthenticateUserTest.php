<?php

use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Pterodactyl\Http\Middleware\Api\Application\AuthenticateApplicationUser;

test('no user defined', function () {
    $this->setRequestUserModel(null);

    (new AuthenticateApplicationUser())->handle($this->request, $this->getClosureAssertions());
})->throws(AccessDeniedHttpException::class);

test('non admin user', function () {
    $this->generateRequestUserModel(['root_admin' => false]);

    (new AuthenticateApplicationUser())->handle($this->request, $this->getClosureAssertions());
})->throws(AccessDeniedHttpException::class);

test('admin user', function () {
    $this->generateRequestUserModel(['root_admin' => true]);

    (new AuthenticateApplicationUser())->handle($this->request, $this->getClosureAssertions());
});
