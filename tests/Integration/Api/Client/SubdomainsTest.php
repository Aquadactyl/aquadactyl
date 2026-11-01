<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Subuser;
use Pterodactyl\Models\Permission;
use Illuminate\Support\Facades\Queue;
use Pterodactyl\Models\ServerSubdomain;
use Pterodactyl\Models\SubdomainDomain;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

beforeEach(function () {
    Queue::fake();
    [$this->user, $this->server] = $this->generateTestAccount();
    $this->domain = SubdomainDomain::create(['domain' => 'games.example.com', 'zone_id' => str_repeat('a', 32), 'api_token' => 'secret-token']);
    $this->url = '/api/client/servers/' . $this->server->uuid . '/settings/subdomain';
    $this->payload = ['domain_id' => $this->domain->id, 'label' => 'my-server', 'minecraft_srv' => false];
});

test('server owners can discover configure and remove an address without receiving DNS credentials', function () {
    $this->actingAs($this->user)->getJson($this->url)->assertOk()->assertJsonPath('subdomain', null)->assertJsonPath('domains.0.domain', 'games.example.com')->assertDontSee('secret-token');
    $this->postJson($this->url, $this->payload)->assertStatus(202)->assertJsonPath('status', 'pending');
    $this->getJson($this->url)->assertOk()->assertJsonPath('subdomain.hostname', 'my-server.games.example.com')->assertJsonPath('subdomain.port', $this->server->allocation->port);
    $this->deleteJson($this->url)->assertStatus(202);
    $this->assertDatabaseHas('server_subdomains', ['server_id' => $this->server->id, 'status' => 'deleting']);
});

test('subdomain controls disappear when domains are disabled and new reservations are blocked', function () {
    $this->domain->update(['enabled' => false]);
    $this->actingAs($this->user)->getJson($this->url)->assertOk()->assertJsonCount(0, 'domains');
    $this->postJson($this->url, $this->payload)->assertNotFound();
});

test('subdomain labels are strict DNS labels', function (mixed $label) {
    $this->actingAs($this->user)->postJson($this->url, array_replace($this->payload, ['label' => $label]))->assertUnprocessable();
})->with(['../escape', '-invalid', 'invalid-', 'bad.name', 'UPPERCASE', '', str_repeat('a', 64), [['x']]]);

test('reservations cannot replace another record or another servers name', function (bool $sameServer) {
    ServerSubdomain::create(['server_id' => $sameServer ? $this->server->id : $this->createServerModel()->id, 'domain_id' => $this->domain->id, 'label' => $sameServer ? 'existing' : 'my-server']);
    $this->actingAs($this->user)->postJson($this->url, $this->payload)->assertStatus(409);
})->with([true, false]);

test('subusers need settings rename permission to manage subdomains', function (bool $allowed) {
    $user = User::factory()->create();
    Subuser::create(['user_id' => $user->id, 'server_id' => $this->server->id, 'permissions' => $allowed ? [Permission::ACTION_SETTINGS_RENAME] : []]);
    $response = $this->actingAs($user)->getJson($this->url);
    $allowed ? $response->assertOk() : $response->assertForbidden();
})->with([true, false]);

test('unrelated accounts cannot discover or change server addresses', function () {
    $this->actingAs(User::factory()->create())->postJson($this->url, $this->payload)->assertNotFound();
});
