<?php

use Illuminate\Http\Request;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\Task;
use Pterodactyl\Models\User;
use Illuminate\Routing\Route;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Location;
use Pterodactyl\Models\ServerTransfer;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Pterodactyl\Exceptions\Http\Server\ServerStateConflictException;
use Pterodactyl\Http\Controllers\Api\Client\Servers\WebsocketController;
use Pterodactyl\Http\Middleware\Api\Client\Server\ResourceBelongsToServer;
use Pterodactyl\Http\Middleware\Api\Client\Server\AuthenticateServerAccess;

uses(DatabaseTransactions::class);

function serverAccessRequest(array $parameters, string $name = 'api:client:server.files', ?User $user = null): Request
{
    $request = Request::create('/contract');
    $route = new Route('GET', '/contract', fn () => null);
    $route->name($name)->bind($request);
    foreach ($parameters as $key => $value) {
        $route->setParameter($key, $value);
    }
    $request->setRouteResolver(fn () => $route);
    $request->setUserResolver(fn () => $user);

    return $request;
}

test('server access rejects unbound servers before reaching the controller', function () {
    $request = serverAccessRequest(['server' => 'missing'], user: User::factory()->make());
    expect(fn () => (new AuthenticateServerAccess())->handle($request, fn () => 'unsafe'))->toThrow(NotFoundHttpException::class);
});

test('server state access permits overview and administrator installation logs while protecting other endpoints', function (bool $admin, string $status, string $route, bool $allowed) {
    $user = User::factory()->make(['id' => 999, 'root_admin' => $admin]);
    $server = Server::factory()->make(['id' => 77, 'owner_id' => $user->id, 'status' => $status]);
    $server->setRelation('node', Node::factory()->make(['maintenance_mode' => false]));
    $server->setRelation('transfer', null);
    $request = serverAccessRequest(['server' => $server], $route, $user);
    $action = fn () => (new AuthenticateServerAccess())->handle($request, fn () => 'allowed');
    if ($allowed) {
        expect($action())->toBe('allowed')->and($request->attributes->get('server'))->toBe($server);
    } else {
        expect($action)->toThrow(ServerStateConflictException::class);
    }
})->with([
    [false, Server::STATUS_INSTALLING, 'api:client:server.view', true],
    [false, Server::STATUS_INSTALLING, 'api:client:server.ws', false],
    [true, Server::STATUS_INSTALLING, 'api:client:server.ws', true],
    [true, Server::STATUS_SUSPENDED, 'api:client:server.ws', false],
    [false, Server::STATUS_SUSPENDED, 'api:client:server.files', false],
]);

test('resource ownership guards fail closed for missing servers tasks and unsupported model types', function (string $invalid) {
    $server = $this->createServerModel();
    $params = ['server' => $server, 'opaque' => 'identifier'];
    $error = NotFoundHttpException::class;
    if ($invalid === 'server') {
        $params['server'] = null;
        $error = InvalidArgumentException::class;
    }
    if ($invalid === 'type') {
        $params['resource'] = new Location();
        $error = InvalidArgumentException::class;
    }
    if ($invalid === 'task') {
        $params['task'] = Task::factory()->make(['schedule_id' => 10]);
    }
    if ($invalid === 'user') {
        $params['user'] = User::factory()->create();
    }
    expect(fn () => (new ResourceBelongsToServer())->handle(serverAccessRequest($params), fn () => 'unsafe'))->toThrow($error);
})->with(['server', 'type', 'task', 'user']);

test('legacy user route bindings expose only the matching server subuser', function () {
    [$user, $server] = $this->generateTestAccount(['control.console']);
    $request = serverAccessRequest(['server' => $server, 'user' => $user]);
    expect((new ResourceBelongsToServer())->handle($request, fn () => 'allowed'))->toBe('allowed');
    expect($request->attributes->get('subuser')->user_id)->toBe($user->id);
});

test('archived server transfers issue websocket tokens for the destination node only to administrators', function (bool $admin) {
    $server = $this->createServerModel();
    $user = $admin ? User::factory()->create(['root_admin' => true]) : $server->user;
    $destination = Node::factory()->create(['location_id' => $server->node->location_id, 'fqdn' => 'destination.example.test', 'scheme' => 'https']);
    $transfer = (new ServerTransfer())->forceFill(['archived' => true]);
    $transfer->setRelation('newNode', $destination);
    $server->setRelation('transfer', $transfer);
    $request = new ClientApiRequest();
    $request->setUserResolver(fn () => $user);
    $controller = app(WebsocketController::class);
    if (!$admin) {
        expect(fn () => $controller($request, $server))->toThrow(Pterodactyl\Exceptions\Http\HttpForbiddenException::class, 'transfer logs');
    } else {
        $data = $controller($request, $server)->getData(true)['data'];
        expect($data['socket'])->toBe('wss://destination.example.test:' . $destination->daemonListen . '/api/servers/' . $server->uuid . '/ws');
        $jwt = Lcobucci\JWT\Configuration::forSymmetricSigner(new Lcobucci\JWT\Signer\Hmac\Sha256(), Lcobucci\JWT\Signer\Key\InMemory::plainText($destination->getDecryptedKey()));
        $token = $jwt->parser()->parse($data['token']);
        expect($jwt->validator()->validate($token, new Lcobucci\JWT\Validation\Constraint\SignedWith(new Lcobucci\JWT\Signer\Hmac\Sha256(), Lcobucci\JWT\Signer\Key\InMemory::plainText($destination->getDecryptedKey()))))->toBeTrue();
    }
})->with([true, false]);
