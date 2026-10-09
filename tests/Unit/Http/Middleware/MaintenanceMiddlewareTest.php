<?php

use Mockery as m;
use Pterodactyl\Models\Node;
use Illuminate\Http\Response;
use Pterodactyl\Models\Server;
use Illuminate\Contracts\Routing\ResponseFactory;
use Pterodactyl\Http\Middleware\MaintenanceMiddleware;

beforeEach(function () {
    $this->response = m::mock(ResponseFactory::class);
});

test('node not in maintenance mode continues through request cycle', function () {
    $server = Server::factory()->make();
    $node = Node::factory()->make(['maintenance' => 0]);

    $server->setRelation('node', $node);
    $this->setRequestAttribute('server', $server);

    (new MaintenanceMiddleware($this->response))->handle($this->request, $this->getClosureAssertions());
});

test('node in maintenance mode returns error view', function () {
    $server = Server::factory()->make();
    $node = Node::factory()->make(['maintenance_mode' => 1]);

    $server->setRelation('node', $node);
    $this->setRequestAttribute('server', $server);

    $this->response->shouldReceive('view')
        ->once()
        ->with('errors.maintenance')
        ->andReturn(new Response());

    $response = (new MaintenanceMiddleware($this->response))->handle($this->request, $this->getClosureAssertions());

    expect($response)->toBeInstanceOf(Response::class);
});
