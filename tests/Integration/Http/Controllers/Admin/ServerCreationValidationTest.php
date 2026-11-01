<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Allocation;
use Illuminate\Support\Facades\Validator;
use Pterodactyl\Http\Requests\Admin\ServerFormRequest;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Servers\ServerCreationService;

uses(DatabaseTransactions::class);

test('legacy server creation rejects allocations on other nodes or assigned to another server', function (string $allocationType) {
    $server = $this->createServerModel();
    $allocation = match ($allocationType) {
        'other-node' => $this->createServerModel()->allocation,
        'assigned' => $server->allocation,
        default => Allocation::factory()->create(['node_id' => $server->node_id]),
    };
    $payload = array_replace($server->getAttributes(), ['name' => 'New server', 'allocation_id' => Allocation::factory()->create(['node_id' => $server->node_id])->id, 'allocation_additional' => [$allocation->id], 'auto_deploy' => false]);
    $request = ServerFormRequest::create('/admin/servers/new', 'POST', $payload);
    $validator = Validator::make($payload, $request->rules());
    $request->withValidator($validator);
    expect($validator->errors()->has('allocation_additional.0'))->toBe($allocationType !== 'free');
})->with(['other-node', 'assigned', 'free']);

test('legacy server creation passes a custom image through to the creation service', function () {
    config()->set('pterodactyl.auth.2fa_required', 0);
    $this->actingAs(User::factory()->create(['root_admin' => true]));
    $server = $this->createServerModel();
    $payload = array_replace($server->getAttributes(), ['allocation_id' => Allocation::factory()->create(['node_id' => $server->node_id])->id, 'name' => 'New server', 'auto_deploy' => false, 'custom_image' => 'ghcr.io/example/custom:latest']);
    unset($payload['id'], $payload['uuid'], $payload['uuidShort'], $payload['created_at'], $payload['updated_at']);
    $this->mock(ServerCreationService::class)->shouldReceive('handle')->once()->with(Mockery::on(fn ($data) => $data['image'] === $payload['custom_image'] && !isset($data['custom_image'])))->andReturn($server);
    $this->post('/admin/servers/new', $payload)->assertRedirect('/admin/servers/view/' . $server->id);
});
