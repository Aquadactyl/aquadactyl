<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Filters\AdminServerFilter;
use Pterodactyl\Models\Filters\MultiFieldServerFilter;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('administrative server searches match owner email username external ID name and both identifiers', function (string $field) {
    $server = $this->createServerModel(['name' => 'Coverage search name', 'external_id' => 'coverage-external-id']);
    $server->user->update(['email' => 'coverage-search@example.test', 'username' => 'coverage-search-owner']);
    $other = $this->createServerModel();
    $value = match ($field) {
        'email' => 'coverage-search@', 'username' => 'search-owner', 'name' => 'search name', 'external' => $server->external_id, 'identifier' => $server->identifier, default => $server->uuid,
    };
    $query = Server::query();
    (new AdminServerFilter())($query, $value, 'search');
    expect($query->pluck('servers.id')->all())->toBe([$server->id]);
})->with(['email', 'username', 'name', 'external', 'identifier', 'uuid']);

test('server search filters reject the wrong table instead of applying unexpected joins', function (string $filter) {
    expect(fn () => (new $filter())(User::query(), 'test', 'search'))->toThrow(BadMethodCallException::class);
})->with([AdminServerFilter::class, MultiFieldServerFilter::class]);
