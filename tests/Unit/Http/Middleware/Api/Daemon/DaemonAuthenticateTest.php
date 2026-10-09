<?php

use Mockery as m;
use Pterodactyl\Models\Node;
use Illuminate\Contracts\Encryption\Encrypter;
use Pterodactyl\Repositories\Eloquent\NodeRepository;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Pterodactyl\Exceptions\Repository\RecordNotFoundException;
use Pterodactyl\Http\Middleware\Api\Daemon\DaemonAuthenticate;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

beforeEach(function () {
    $this->encrypter = m::mock(Encrypter::class);
    $this->repository = m::mock(NodeRepository::class);
});

test('response should continue if route is exempted', function () {
    $this->request->expects('route->getName')->withNoArgs()->andReturn('daemon.configuration');

    (new DaemonAuthenticate($this->encrypter, $this->repository))->handle($this->request, $this->getClosureAssertions());
});

test('response should fail if no token is provided', function () {
    $this->request->expects('route->getName')->withNoArgs()->andReturn('random.route');
    $this->request->expects('bearerToken')->withNoArgs()->andReturnNull();

    try {
        (new DaemonAuthenticate($this->encrypter, $this->repository))->handle($this->request, $this->getClosureAssertions());
    } catch (HttpException $exception) {
        expect($exception->getStatusCode())->toBe(401)
            ->and(is_array($exception->getHeaders()))->toBeTrue()
            ->and($exception->getHeaders())->toHaveKey('WWW-Authenticate')
            ->and($exception->getHeaders()['WWW-Authenticate'])->toBe('Bearer');
    }
});

test('response should fail if token format is incorrect', function (string $token) {
    $this->request->expects('route->getName')->withNoArgs()->andReturn('random.route');
    $this->request->expects('bearerToken')->withNoArgs()->andReturn($token);

    (new DaemonAuthenticate($this->encrypter, $this->repository))->handle($this->request, $this->getClosureAssertions());
})->with([
    'foo',
    'foobar',
    'foo-bar',
    'foo.bar.baz',
    '.foo',
    'foo.',
    'foo..bar',
])->throws(BadRequestHttpException::class);

test('response should fail if token is not valid', function () {
    /** @var Node $model */
    $model = Node::factory()->make();

    $this->request->expects('route->getName')->withNoArgs()->andReturn('random.route');
    $this->request->expects('bearerToken')->withNoArgs()->andReturn($model->daemon_token_id . '.random_string_123');

    $this->repository->expects('findFirstWhere')->with(['daemon_token_id' => $model->daemon_token_id])->andReturn($model);
    $this->encrypter->expects('decrypt')->with($model->daemon_token)->andReturns(decrypt($model->daemon_token));

    (new DaemonAuthenticate($this->encrypter, $this->repository))->handle($this->request, $this->getClosureAssertions());
})->throws(AccessDeniedHttpException::class);

test('response should fail if node is not found', function () {
    $this->request->expects('route->getName')->withNoArgs()->andReturn('random.route');
    $this->request->expects('bearerToken')->withNoArgs()->andReturn('abcd1234.random_string_123');

    $this->repository->expects('findFirstWhere')->with(['daemon_token_id' => 'abcd1234'])->andThrow(RecordNotFoundException::class);

    (new DaemonAuthenticate($this->encrypter, $this->repository))->handle($this->request, $this->getClosureAssertions());
})->throws(AccessDeniedHttpException::class);

test('successful middleware process', function () {
    /** @var Node $model */
    $model = Node::factory()->make();

    $this->request->expects('route->getName')->withNoArgs()->andReturn('random.route');
    $this->request->expects('bearerToken')->withNoArgs()->andReturn($model->daemon_token_id . '.' . decrypt($model->daemon_token));

    $this->repository->expects('findFirstWhere')->with(['daemon_token_id' => $model->daemon_token_id])->andReturn($model);
    $this->encrypter->expects('decrypt')->with($model->daemon_token)->andReturns(decrypt($model->daemon_token));

    (new DaemonAuthenticate($this->encrypter, $this->repository))->handle($this->request, $this->getClosureAssertions());
    $this->assertRequestHasAttribute('node');
    $this->assertRequestAttributeEquals($model, 'node');
});
