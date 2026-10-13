<?php

use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Permission;
use Pterodactyl\Services\Files\TrashPath;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;

dataset('client file mutations', [
    ['create-folder', 'POST', 'createDirectory', ['name' => 'plugins', 'root' => '/'], ['plugins', '/']],
    ['rename', 'PUT', 'renameFiles', ['root' => '/', 'files' => [['from' => 'old.txt', 'to' => 'new.txt']]], ['/', [['from' => 'old.txt', 'to' => 'new.txt']]]],
    ['copy', 'POST', 'copyFile', ['location' => '/notes.txt'], ['/notes.txt']],
    ['decompress', 'POST', 'decompressFile', ['root' => '/', 'file' => 'archive.zip'], ['/', 'archive.zip']],
    ['delete', 'POST', 'deleteFiles', ['root' => '/', 'files' => ['notes.txt']], ['/', ['notes.txt']]],
    ['chmod', 'POST', 'chmodFiles', ['root' => '/', 'files' => [['file' => 'notes.txt', 'mode' => '644']]], ['/', [['file' => 'notes.txt', 'mode' => '644']]]],
    ['pull', 'POST', 'pull', ['url' => 'https://downloads.example.test/plugin.jar', 'directory' => '/plugins', 'filename' => 'plugin.jar', 'use_header' => false, 'foreground' => true], ['https://downloads.example.test/plugin.jar', '/plugins', ['filename' => 'plugin.jar', 'use_header' => false, 'foreground' => true]]],
]);

test('client file mutations validate input before invoking Wings', function (string $endpoint, string $verb, string $operation, array $payload, array $arguments) {
    [$user, $server] = $this->generateTestAccount([
        Permission::ACTION_FILE_CREATE, Permission::ACTION_FILE_UPDATE,
        Permission::ACTION_FILE_DELETE, Permission::ACTION_FILE_ARCHIVE,
    ]);
    $repository = Mockery::mock(DaemonFileRepository::class);
    $repository->shouldReceive('setServer')->once()->with(Mockery::on(fn ($model) => $model->id === $server->id))->andReturnSelf();
    $repository->shouldReceive($operation)->once()->withArgs($arguments)->andReturn(new Response(204));
    $this->app->instance(DaemonFileRepository::class, $repository);
    $this->actingAs($user)->json($verb, $this->link($server, '/files/' . $endpoint), [])->assertUnprocessable();
    $this->json($verb, $this->link($server, '/files/' . $endpoint), $payload)->assertNoContent();
})->with('client file mutations');

test('subusers without file permissions cannot trigger file mutations', function (string $endpoint, string $verb, string $operation, array $payload) {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_CONTROL_CONSOLE]);
    $repository = Mockery::mock(DaemonFileRepository::class);
    $repository->shouldNotReceive('setServer');
    $this->app->instance(DaemonFileRepository::class, $repository);
    $this->actingAs($user)->json($verb, $this->link($server, '/files/' . $endpoint), $payload)->assertForbidden();
})->with('client file mutations');

test('directory listings hide the trash directory and preserve ordinary files', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_READ]);
    $repository = Mockery::mock(DaemonFileRepository::class);
    $repository->shouldReceive('setServer')->once()->andReturnSelf();
    $repository->shouldReceive('getDirectory')->once()->with('/')->andReturn([
        ['name' => TrashPath::DIRECTORY, 'mime' => 'inode/directory'],
        ['name' => 'notes.txt', 'mime' => 'text/plain'],
    ]);
    $this->app->instance(DaemonFileRepository::class, $repository);
    $this->actingAs($user)->getJson($this->link($server, '/files/list'))
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.attributes.name', 'notes.txt');
});

test('file reads return plain text and pass the configured edit size limit to Wings', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_READ_CONTENT]);
    config()->set('pterodactyl.files.max_edit_size', 4096);
    $repository = Mockery::mock(DaemonFileRepository::class);
    $repository->shouldReceive('setServer')->once()->andReturnSelf();
    $repository->shouldReceive('getContent')->once()->with('/notes.txt', 4096)->andReturn('<example>plain text</example>');
    $this->app->instance(DaemonFileRepository::class, $repository);
    $this->actingAs($user)->get($this->link($server, '/files/contents?file=%2Fnotes.txt'))
        ->assertOk()->assertHeader('Content-Type', 'text/plain; charset=utf-8')->assertContent('<example>plain text</example>');
});

test('file writes forward the raw request body without JSON conversion', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_CREATE]);
    $repository = Mockery::mock(DaemonFileRepository::class);
    $repository->shouldReceive('setServer')->once()->andReturnSelf();
    $repository->shouldReceive('putContent')->once()->with('/notes.txt', "first\nsecond\n")->andReturn(new Response(204));
    $this->app->instance(DaemonFileRepository::class, $repository);
    $this->actingAs($user)->call('POST', $this->link($server, '/files/write?file=%2Fnotes.txt'), [], [], [], ['CONTENT_TYPE' => 'text/plain'], "first\nsecond\n")->assertNoContent();
});

test('file download tokens bind the file and server to the authorized user', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_READ_CONTENT]);
    $response = $this->actingAs($user)->getJson($this->link($server, '/files/download?file=%2Fnotes.txt'))->assertOk();
    $url = $response->json('attributes.url');
    expect($url)->toStartWith($server->node->getConnectionAddress() . '/download/file?token=');
    parse_str(parse_url($url, PHP_URL_QUERY), $query);
    $claims = json_decode(base64_decode(strtr(explode('.', $query['token'])[1], '-_', '+/')), true);
    expect($claims['server_uuid'])->toBe($server->uuid)
        ->and($claims['user_uuid'])->toBe($user->uuid)
        ->and($claims['file_path'])->toBe('/notes.txt')
        ->and($claims['exp'] - $claims['iat'])->toBe(900);
});
