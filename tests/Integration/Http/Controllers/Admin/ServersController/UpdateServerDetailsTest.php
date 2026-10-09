<?php

use Pterodactyl\Models\User;

test('external id must be unique when updating server details', function () {
    $server = $this->createServerModel(['external_id' => 'first-external-id']);
    $otherServer = $this->createServerModel(['external_id' => 'duplicate-external-id']);

    $this->actingAs(User::factory()->admin()->create())
        ->withHeaders(['Accept' => 'text/html'])
        ->patch(route('admin.servers.view.details', ['server' => $server]), [
            'external_id' => $otherServer->external_id,
            'owner_id' => $server->owner_id,
            'name' => $server->name,
            'description' => $server->description,
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('external_id');

    expect($server->refresh()->external_id)->toBe('first-external-id');
});
