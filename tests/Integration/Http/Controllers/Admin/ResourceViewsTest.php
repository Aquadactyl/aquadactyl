<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\DatabaseHost;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Helpers\SoftwareVersionService;

uses(DatabaseTransactions::class);

dataset('admin resource views', [
    ['admin.servers.view', 'server', 'admin.servers.view.index'],
    ['admin.servers.view.details', 'server', 'admin.servers.view.details'],
    ['admin.servers.view.build', 'server', 'admin.servers.view.build'],
    ['admin.servers.view.startup', 'server', 'admin.servers.view.startup'],
    ['admin.servers.view.database', 'server', 'admin.servers.view.database'],
    ['admin.servers.view.mounts', 'server', 'admin.servers.view.mounts'],
    ['admin.servers.view.manage', 'server', 'admin.servers.view.manage'],
    ['admin.servers.view.delete', 'server', 'admin.servers.view.delete'],
    ['admin.nodes.view', 'node', 'admin.nodes.view.index'],
    ['admin.nodes.view.settings', 'node', 'admin.nodes.view.settings'],
    ['admin.nodes.view.configuration', 'node', 'admin.nodes.view.configuration'],
    ['admin.nodes.view.allocation', 'node', 'admin.nodes.view.allocation'],
    ['admin.nodes.view.servers', 'node', 'admin.nodes.view.servers'],
    ['admin.locations.view', 'location', 'admin.locations.view'],
    ['admin.databases.view', 'host', 'admin.databases.view'],
    ['admin.nests.view', 'nest', 'admin.nests.view'],
    ['admin.nests.egg.view', 'egg', 'admin.eggs.view'],
    ['admin.nests.egg.variables', 'egg', 'admin.eggs.variables'],
    ['admin.nests.egg.scripts', 'egg', 'admin.eggs.scripts'],
]);

beforeEach(function () {
    app('cache')->forever(SoftwareVersionService::VERSION_CACHE_KEY, ['panel' => '1.0.0', 'wings' => '1.0.0']);
    $this->admin = User::factory()->create(['root_admin' => true]);
    $server = $this->createServerModel();
    $this->resources = ['server' => $server, 'node' => $server->node, 'location' => $server->node->location,
        'nest' => $server->nest, 'egg' => $server->egg, 'host' => DatabaseHost::factory()->create()];
});

test('admin resource views bind the correct model and render their management forms', function (string $name, string $resource, string $view) {
    $response = $this->actingAs($this->admin)->get(route($name, $this->resources[$resource]->id));
    $response->assertOk()->assertViewIs($view);
})->with('admin resource views');

test('non-administrators cannot access resource management pages', function (string $name, string $resource) {
    $user = User::factory()->create(['root_admin' => false]);
    $this->actingAs($user)->get(route($name, $this->resources[$resource]->id))->assertForbidden();
})->with('admin resource views');

test('unknown resource identifiers return a missing resource response', function () {
    $this->actingAs($this->admin)->get(route('admin.servers.view', 99999999))->assertNotFound();
    $this->get(route('admin.nodes.view', 99999999))->assertNotFound();
});
