<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Location;
use Pterodactyl\Models\Allocation;
use Pterodactyl\Models\ActivityLog;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set('pterodactyl.auth.2fa_required', 0);
    $this->admin = User::factory()->create(['root_admin' => true]);
    $this->actingAs($this->admin);
    $this->location = Location::factory()->create();
    $this->payload = ['name' => 'Inline node', 'location_id' => $this->location->id, 'fqdn' => '127.0.0.1', 'scheme' => 'http', 'memory' => 8192, 'disk' => 51200, 'memory_overallocate' => 0, 'disk_overallocate' => 0, 'daemonListen' => 8080, 'daemonSFTP' => 2022, 'allocation_ip' => '192.0.2.10', 'allocation_port' => 25565];
});

test('creation pages include inline setup and preserve empty installation setup paths', function () {
    $this->get('/admin/servers/new')->assertOk()->assertSee('quick-node-form')->assertSee('quick-location-form');
    $this->get('/admin/nodes/new')->assertOk()->assertSee('quick-location-form');
});

test('inline location creation returns only the selection fields and records the action', function () {
    $this->postJson('/admin/setup/locations', ['short' => 'inline-unique', 'long' => 'Inline location'])->assertCreated()->assertJsonPath('data.short', 'inline-unique');
    $location = Location::where('short', 'inline-unique')->firstOrFail();
    expect(ActivityLog::forEvent('admin:location.created')->firstOrFail()->subjects->first()->subject_id)->toBe($location->id);
});

test('inline node creation returns an allocation and never daemon credentials', function () {
    $response = $this->postJson('/admin/setup/nodes', $this->payload)->assertCreated();
    $node = Node::findOrFail($response->json('data.id'));
    $response->assertExactJson(['data' => ['id' => $node->id, 'text' => 'Inline node', 'location_id' => $this->location->id, 'allocations' => [['id' => Allocation::where('node_id', $node->id)->firstOrFail()->id, 'text' => '192.0.2.10:25565']], 'configuration_url' => '/admin/nodes/view/' . $node->id . '/configuration']]);
    expect($response->getContent())->not->toContain('daemon_token', $node->daemon_token_id, decrypt($node->daemon_token));
});

test('inline setup enforces administrator access', function (string $path) {
    $this->actingAs(User::factory()->create(['root_admin' => false]))->postJson($path, $this->payload)->assertForbidden();
})->with(['/admin/setup/nodes', '/admin/setup/locations']);

test('invalid inline node requests leave no partial node or allocation', function (string $field, mixed $value) {
    $before = Node::count();
    expect(fn () => $this->withoutExceptionHandling()->postJson('/admin/setup/nodes', array_replace($this->payload, [$field => $value])))
        ->toThrow(Illuminate\Validation\ValidationException::class);
    expect(Node::count())->toBe($before);
})->with([['allocation_ip', 'not-an-ip'], ['allocation_port', 0], ['location_id', 99999999], ['scheme', 'file'], ['memory', 0]]);

test('duplicate location codes fail validation', function () {
    $this->postJson('/admin/setup/locations', ['short' => $this->location->short])->assertUnprocessable();
});
