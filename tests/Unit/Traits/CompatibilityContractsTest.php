<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Services\Files\TrashPath;
use Pterodactyl\Extensions\Lcobucci\JWT\Encoding\TimestampDates;

test('realtime lookup rejects unrelated prefixes and invalid encoded identifiers without broadening queries', function (string $identifier) {
    expect(Server::whereIdentifier($identifier)->toSql())->toContain('0 = 1');
})->with(['user_abcd', 'serv_!', 'serv_']);

test('legacy builders retain their query when deprecated search is called', function () {
    $builder = new Pterodactyl\Extensions\Illuminate\Database\Eloquent\Builder(Server::query()->toBase());
    $builder->setModel(new Server())->where('name', 'Coverage');
    $query = $builder->toSql();
    expect($builder->search())->toBe($builder)->and($builder->toSql())->toBe($query);
});

test('JWT date formatting retains non-date claims when optional dates are absent', function () {
    $claims = ['sub' => 'user', 'exp' => new DateTimeImmutable('@1000')];
    expect((new TimestampDates())->formatClaims($claims))->toBe(['sub' => 'user', 'exp' => 1000]);
});

test('trash paths normalize parent navigation and reject Windows separators and null bytes', function () {
    expect(TrashPath::normalize('/world/../notes.txt'))->toBe('/notes.txt');
    expect(fn () => TrashPath::normalize('world\\notes.txt'))->toThrow(Symfony\Component\HttpKernel\Exception\BadRequestHttpException::class);
    expect(fn () => TrashPath::normalize("world\0notes.txt"))->toThrow(Symfony\Component\HttpKernel\Exception\BadRequestHttpException::class);
});

test('server policies deny unrelated users and the optional post-authorization hook does not grant access', function () {
    $server = Server::factory()->make(['owner_id' => 10]);
    $server->setRelation('subusers', collect());
    $user = User::factory()->make(['id' => 11]);
    $policy = new Pterodactyl\Policies\ServerPolicy();
    expect($policy->before($user, 'control.console', $server))->toBeFalse();
    expect($policy->after($user, 'control.console', false, [$server]))->toBeNull();
});

test('service return-model preferences and JavaScript request injection support legacy extensions', function () {
    $service = new class {
        use Pterodactyl\Traits\Services\ReturnsUpdatedModels;
    };
    expect($service->getUpdatedModel())->toBeFalse()->and($service->returnUpdatedModel()->getUpdatedModel())->toBeTrue()->and($service->returnUpdatedModel(false)->getUpdatedModel())->toBeFalse();
    $controller = new class {
        use Pterodactyl\Traits\Controllers\JavascriptInjection;
    };
    expect($controller->setRequest(Illuminate\Http\Request::create('/legacy')))->toBe($controller);
    expect(fn () => app(Pterodactyl\Repositories\Eloquent\PermissionRepository::class))->toThrow(Exception::class, 'not implemented');
});

test('local game queries choose the container UUID only for the configured local Wings host', function (bool $local) {
    config()->set('game-query.enabled', true);
    config()->set('game-query.local_container_queries', $local);
    config()->set('aquadactyl.features.player_counts', true);
    $server = Server::factory()->make(['id' => 99, 'node_id' => 77, 'game_query_type' => 'protocol-minecraftvanilla']);
    $server->setRelation('node', Node::factory()->make(['id' => 77, 'fqdn' => 'wings.localhost', 'query_address' => null]));
    $server->setRelation('allocation', Allocation::factory()->make(['server_id' => 99, 'node_id' => 77, 'ip' => '127.0.0.1']));
    $server->setRelation('gameQueryAllocation', null);
    expect(app(Pterodactyl\Services\Servers\GameQuery\GameQuerySettingsService::class)->target($server)['host'])->toBe($local ? $server->uuid : 'wings.localhost');
})->with([true, false]);
