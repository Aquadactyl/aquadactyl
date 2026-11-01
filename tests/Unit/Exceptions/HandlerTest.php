<?php

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\Connection;
use Pterodactyl\Exceptions\Handler;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

test('handler register configures dontReport based on app config', function () {
    config()->set('app.exceptions.report_all', true);
    $handler = new Handler(app());
    $handler->register();

    // With report_all true, dontReport is cleared on that handler
    expect($handler->shouldReport(new Pterodactyl\Exceptions\Repository\RecordNotFoundException()))->toBeTrue();

    config()->set('app.exceptions.report_all', false);
    $handler2 = new Handler(app());
    $handler2->register();
    expect($handler2->shouldReport(new Pterodactyl\Exceptions\Repository\RecordNotFoundException()))->toBeFalse();
});

test('handler converts exception to array with production and debug modes', function () {
    config()->set('app.debug', false);

    // Generic exception in production hides details
    $e = new RuntimeException('Sensitive DB query failed');
    $data = Handler::toArray($e);

    expect($data['errors'][0]['code'])->toBe('RuntimeException')
        ->and($data['errors'][0]['status'])->toBe('500')
        ->and($data['errors'][0]['detail'])->toBe('An unexpected error was encountered while processing this request, please try again.');

    // ModelNotFoundException has custom friendly message
    $modelNotFound = new ModelNotFoundException('User model not found');
    $modelData = Handler::toArray($modelNotFound);
    expect($modelData['errors'][0]['detail'])->toBe('The requested resource could not be found on the server.');

    // ModelNotFoundException inside previous exception
    $wrapped = new Exception('Wrapped', 0, $modelNotFound);
    $wrappedData = Handler::toArray($wrapped);
    expect($wrappedData['errors'][0]['detail'])->toBe('The requested resource could not be found on the server.');

    // HttpExceptionInterface preserves its message
    $httpException = new NotFoundHttpException('Custom 404 page');
    $httpData = Handler::toArray($httpException);
    expect($httpData['errors'][0]['status'])->toBe('404')
        ->and($httpData['errors'][0]['detail'])->toBe('Custom 404 page');

    // In debug mode, file, line, and trace are added
    config()->set('app.debug', true);
    $debugException = new RuntimeException('Debug error message', 0, new Exception('Chained cause'));
    $debugData = Handler::toArray($debugException);

    expect($debugData['errors'][0]['detail'])->toBe('Debug error message')
        ->and($debugData['errors'][0])->toHaveKey('source')
        ->and($debugData['errors'][0])->toHaveKey('meta');

    config()->set('app.debug', false);
});

test('handler handles invalid json with validation exceptions and rule mapping', function () {
    $validator = Validator::make(
        ['name' => ''],
        ['name' => 'required']
    );

    $exception = new ValidationException($validator);
    $handler = new Handler(app());

    $request = Request::create('/api/client', 'POST');
    $response = $handler->invalidJson($request, $exception);

    expect($response)->toBeInstanceOf(JsonResponse::class)
        ->and($response->getStatusCode())->toBe(422);

    $responseData = $response->getData(true);
    expect($responseData)->toHaveKey('errors')
        ->and($responseData['errors'][0]['meta']['source_field'])->toBe('name')
        ->and($responseData['errors'][0]['meta']['rule'])->toBe('required');
});

test('handler rolls back active transactions on render', function () {
    $connection = Mockery::mock(Connection::class);
    $connection->shouldReceive('transactionLevel')->once()->andReturn(1);
    $connection->shouldReceive('rollBack')->with(0)->once();
    app()->instance(Connection::class, $connection);

    $handler = new Handler(app());
    $request = Request::create('/api/test', 'GET');
    $request->headers->set('Accept', 'application/json');

    $response = $handler->render($request, new NotFoundHttpException('Not found'));
    expect($response)->toBeInstanceOf(Symfony\Component\HttpFoundation\Response::class);
});

test('handler unauthenticated method handles json and web redirects', function () {
    $handler = new Handler(app());
    $authException = new AuthenticationException('Unauthenticated.');

    // JSON request
    $jsonRequest = Request::create('/api/test', 'GET');
    $jsonRequest->headers->set('Accept', 'application/json');

    $callMethod = new ReflectionMethod(Handler::class, 'unauthenticated');
    $callMethod->setAccessible(true);

    $jsonResponse = $callMethod->invoke($handler, $jsonRequest, $authException);
    expect($jsonResponse)->toBeInstanceOf(JsonResponse::class)
        ->and($jsonResponse->getStatusCode())->toBe(401);

    // Web request
    $webRequest = Request::create('/admin/servers', 'GET');
    $webResponse = $callMethod->invoke($handler, $webRequest, $authException);
    expect($webResponse)->toBeInstanceOf(RedirectResponse::class)
        ->and($webResponse->getTargetUrl())->toContain('/auth/login');
});

test('handler cleans stack traces for PDOException and TransportException', function () {
    $handler = new Handler(app());

    $cleanMethod = new ReflectionMethod(Handler::class, 'generateCleanedExceptionStack');
    $cleanMethod->setAccessible(true);

    $pdoEx = new PDOException('SQL connection failed with secret credentials in trace');
    $cleanedPdo = $cleanMethod->invoke($handler, $pdoEx);
    expect($cleanedPdo)->toContain('PDOException: SQL connection failed')
        ->and($cleanedPdo)->toContain('Stack trace:');

    $transportEx = new TransportException('SMTP credentials failed');
    $cleanedTransport = $cleanMethod->invoke($handler, $transportEx);
    expect($cleanedTransport)->toContain('TransportException: SMTP credentials failed');

    // Test reporting triggers reportable callbacks
    $handler->report($pdoEx);
    $handler->report($transportEx);
});
