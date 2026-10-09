<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\Server;
use Pterodactyl\Jobs\RevokeSftpAccessJob;
use GuzzleHttp\Exception\TransferException;
use Pterodactyl\Repositories\Wings\DaemonRevocationRepository;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

test('unique id based on model type', function (string $class, string $key) {
    $model = $class::factory()->make(['uuid' => 'uuid-1234']);
    $job = new RevokeSftpAccessJob('user-1', $model);

    expect($job->uniqueId())->toBe("revoke-sftp:user-1:{$key}:uuid-1234");
})->with([
    [Server::class, 'server'],
    [Node::class, 'node'],
]);

test('job releases back to queue on failure', function () {
    $node = Node::factory()->make(['uuid' => 'uuid-1234']);

    $mock = $this->mock(DaemonRevocationRepository::class, function ($mock) {
        $mock->expects('setNode->deauthorize')->andThrows(
            new DaemonConnectionException(new TransferException('Connection failed'))
        );
    });

    $job = \Mockery::mock(RevokeSftpAccessJob::class, ['user-1', $node])->makePartial();
    $job->expects('release')->with(10);

    $job->handle($mock);
});

test('job dispatches for node', function () {
    $node = Node::factory()->make(['uuid' => 'uuid-1234']);

    $mock = $this->mock(DaemonRevocationRepository::class, function ($mock) {
        $mock->expects('setNode')->andReturnSelf();
        $mock->expects('deauthorize')->with('user-1', [])->andReturnUndefined();
    });

    (new RevokeSftpAccessJob('user-1', $node))->handle($mock);
});

test('job dispatches for individual server', function () {
    $node = Node::factory()->make(['uuid' => 'node-1234']);
    $server = Server::factory()->make(['uuid' => 'server-1234'])->setRelation('node', $node);

    $mock = $this->mock(DaemonRevocationRepository::class, function ($mock) {
        $mock->expects('setNode')->with(\Mockery::on(fn (Node $node) => $node->uuid === 'node-1234'))->andReturnSelf();
        $mock->expects('deauthorize')->with('user-1', ['server-1234'])->andReturnUndefined();
    });

    (new RevokeSftpAccessJob('user-1', $server))->handle($mock);
});
