<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Http;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Telemetry\AquadactylTelemetryCollectionService;

uses(DatabaseTransactions::class);

test('telemetry collection keeps a stable anonymous installation ID and omits account and server details', function () {
    $server = $this->createServerModel(['name' => 'Private server name']);
    $service = app(AquadactylTelemetryCollectionService::class);
    $payload = $service->collect();
    expect($payload['instanceId'])->toMatch('/^[a-f0-9-]{36}$/')
        ->and($service->collect()['instanceId'])->toBe($payload['instanceId'])
        ->and($payload['schema'])->toBe(1)
        ->and($payload['panel']['phpVersion'])->toBe(PHP_VERSION)
        ->and($payload['resources'])->toBe(['users' => User::count(), 'servers' => Server::count(), 'nodes' => Node::count()]);
    expect(json_encode($payload))->not->toContain($server->name, $server->user->email, $server->node->fqdn, $server->uuid, $server->node->daemon_token);
});

test('telemetry is never sent without both explicit consent and an endpoint', function (mixed $enabled, ?string $endpoint) {
    Http::fake();
    config()->set('aquadactyl.telemetry', ['enabled' => $enabled, 'endpoint' => $endpoint]);
    app(AquadactylTelemetryCollectionService::class)();
    Http::assertNothingSent();
})->with([[false, 'https://telemetry.example.test/report'], ['false', 'https://telemetry.example.test/report'], ['invalid', 'https://telemetry.example.test/report'], [true, null]]);

test('enabled telemetry posts the anonymous schema and reports transport failures without interrupting the scheduler', function (int $status) {
    Http::fake(['https://telemetry.example.test/report' => Http::response([], $status)]);
    config()->set('aquadactyl.telemetry', ['enabled' => true, 'endpoint' => 'https://telemetry.example.test/report']);
    if ($status >= 400) {
        $this->mock(ExceptionHandler::class)->shouldReceive('report')->once()->with(Mockery::type(Throwable::class));
    }
    app(AquadactylTelemetryCollectionService::class)();
    Http::assertSentCount(1);
    Http::assertSent(fn ($request) => $request->url() === 'https://telemetry.example.test/report' && $request['schema'] === 1 && count($request['resources']) === 3);
})->with([200, 503]);
