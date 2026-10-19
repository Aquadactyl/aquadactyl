<?php

use Pterodactyl\Models\User;

test('admins can search other servers by owner username email and full name', function (string $query) {
    $owner = User::factory()->create(['username' => 'uniquecustomer', 'email' => 'customer@example.test', 'name_first' => 'Alice', 'name_last' => 'Winters']);
    $server = $this->createServerModel(['user_id' => $owner->id, 'name' => 'Survival']);
    $this->createServerModel(['name' => 'Unrelated']);
    $admin = User::factory()->create(['root_admin' => true]);
    $this->actingAs($admin)->getJson('/api/client?type=admin&filter[*]=' . urlencode($query))->assertOk()
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.attributes.uuid', $server->uuid);
})->with(['UNIQUECUSTOMER', 'CUSTOMER@EXAMPLE.TEST', 'Alice Winters', 'winter']);

test('owner searches never expose extra servers to regular users', function (string $type) {
    [$user, $server] = $this->generateTestAccount();
    $server->user->update(['username' => 'searchowner', 'email' => 'searchowner@example.test']);
    $this->actingAs($user)->getJson('/api/client?type=' . $type . '&filter[*]=searchowner@example.test')
        ->assertOk()->assertJsonCount(0, 'data');
})->with(['admin', 'admin-all', 'owner', '']);
