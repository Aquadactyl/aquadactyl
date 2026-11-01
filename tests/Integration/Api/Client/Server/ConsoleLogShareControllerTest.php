<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Permission;
use Illuminate\Support\Facades\Http;
use Pterodactyl\Http\Requests\Api\Client\Servers\ShareConsoleLogsRequest;

beforeEach(function () {
    config()->set('aquadactyl.features.console_log_sharing', true);
    config()->set('aquadactyl.debug.endpoint', 'https://debug.example.invalid');
    Http::preventStrayRequests();
    Http::fake(['https://debug.example.invalid/paste' => Http::response(['id' => 'console-test'])]);
});

test('console sharing returns an expiring link and uploads only redacted console content', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_WEBSOCKET_CONNECT]);
    $logs = "Server ready\npassword=private-value\nPlayer /203.0.113.27 connected\nEmail=player@example.test\nServer {$server->uuid}\nNode {$server->node->fqdn}";
    $this->actingAs($user)->postJson($this->link($server, 'console/share'), ['content' => $logs])
        ->assertOk()->assertExactJson(['url' => 'https://debug.example.invalid/paste/console-test', 'expires_in' => 86400]);
    Http::assertSent(function ($request) use ($server) {
        expect($request['content'])->toContain('Server ready', '[REDACTED]')
            ->not->toContain('private-value', '203.0.113.27', 'player@example.test', $server->uuid, $server->node->fqdn);

        return $request['expiresIn'] === '24h';
    });
});

test('disabling sharing rejects the endpoint even for an owner', function () {
    [$user, $server] = $this->generateTestAccount();
    config()->set('aquadactyl.features.console_log_sharing', false);
    $this->actingAs($user)->postJson($this->link($server, 'console/share'), ['content' => 'Private logs'])->assertForbidden();
    Http::assertNothingSent();
});

test('subusers require console read access and unrelated users cannot share logs', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_READ]);
    $this->actingAs($user)->postJson($this->link($server, 'console/share'), ['content' => 'Private logs'])->assertForbidden();
    $this->actingAs(User::factory()->create())->postJson($this->link($server, 'console/share'), ['content' => 'Private logs'])->assertNotFound();
    Http::assertNothingSent();
});

test('empty and oversized console uploads are rejected without sending data', function (mixed $content) {
    [$user, $server] = $this->generateTestAccount();
    $this->actingAs($user)->postJson($this->link($server, 'console/share'), ['content' => $content])->assertUnprocessable();
    Http::assertNothingSent();
})->with(['empty' => '', 'whitespace' => '  ', 'array' => [['secret']], 'too large' => str_repeat('é', ShareConsoleLogsRequest::MAX_BYTES / 2 + 1)]);

test('upstream failures return a safe response instead of the log content or remote body', function () {
    [$user, $server] = $this->generateTestAccount();
    Http::swap(new Illuminate\Http\Client\Factory());
    Http::preventStrayRequests();
    Http::fake(['https://debug.example.invalid/paste' => Http::response('sensitive response body', 500)]);
    $response = $this->actingAs($user)->postJson($this->link($server, 'console/share'), ['content' => 'password=private-value']);
    $response->assertStatus(503)->assertJsonPath('errors.0.detail', 'Unable to share console logs. Please try again later.');
    expect($response->getContent())->not->toContain('sensitive response', 'private-value');
});

test('console sharing is rate limited per requesting user', function () {
    [$user, $server] = $this->generateTestAccount();
    for ($attempt = 0; $attempt < 3; ++$attempt) {
        $this->actingAs($user)->postJson($this->link($server, 'console/share'), ['content' => 'Server ready'])->assertOk();
    }
    $this->postJson($this->link($server, 'console/share'), ['content' => 'Server ready'])->assertStatus(429);
    Http::assertSentCount(3);
});
