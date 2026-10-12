<?php

use Illuminate\Http\Request;
use Psr\Log\LoggerInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Prologue\Alerts\AlertsMessageBag;
use Pterodactyl\Exceptions\DisplayException;

test('display exception properties and accessors', function () {
    $e = new DisplayException('Something went wrong', null, DisplayException::LEVEL_WARNING, 42);

    expect($e->getMessage())->toBe('Something went wrong')
        ->and($e->getCode())->toBe(42)
        ->and($e->getErrorLevel())->toBe(DisplayException::LEVEL_WARNING)
        ->and($e->getStatusCode())->toBe(400)
        ->and($e->getHeaders())->toBe([]);
});

test('display exception renders json when request expects json or is api path', function () {
    $e = new DisplayException('Invalid operation');

    $requestJson = Request::create('/api/client/test', 'GET');
    $requestJson->headers->set('Accept', 'application/json');

    $response = $e->render($requestJson);
    expect($response)->toBeInstanceOf(JsonResponse::class)
        ->and($response->getStatusCode())->toBe(400)
        ->and($response->getData(true))->toHaveKey('errors');
});

test('display exception renders redirect and flashes message for web requests', function () {
    $alerts = Mockery::mock(AlertsMessageBag::class);
    $alerts->shouldReceive('danger')->with('Web error occurred')->once()->andReturnSelf();
    $alerts->shouldReceive('flash')->once();
    app()->instance(AlertsMessageBag::class, $alerts);

    $e = new DisplayException('Web error occurred');

    $request = Request::create('/admin/settings', 'GET');
    $request->headers->set('referer', 'http://localhost/admin/settings');
    $request->setLaravelSession(app('session.store'));

    $response = $e->render($request);
    expect($response)->toBeInstanceOf(RedirectResponse::class);
});

test('display exception reports to logger only when previous exception is reportable', function () {
    $eWithoutPrevious = new DisplayException('No previous');
    expect($eWithoutPrevious->report())->toBeNull();

    $eWithNonReportablePrevious = new DisplayException(
        'Previous is auth exception',
        new Illuminate\Auth\AuthenticationException()
    );
    expect($eWithNonReportablePrevious->report())->toBeNull();

    $logger = Mockery::mock(LoggerInterface::class);
    $previous = new RuntimeException('Database failed');
    $logger->shouldReceive('error')->with($previous)->once();
    app()->instance(LoggerInterface::class, $logger);

    $eWithReportable = new DisplayException('Reportable error', $previous, DisplayException::LEVEL_ERROR);
    $eWithReportable->report();
});

test('display exception rethrows previous when logger cannot be resolved', function () {
    $previous = new RuntimeException('Failed');
    $e = new DisplayException('Error', $previous);

    app()->bind(LoggerInterface::class, function () {
        throw new Exception('No logger');
    });

    expect(fn () => $e->report())->toThrow(RuntimeException::class, 'Failed');
});
