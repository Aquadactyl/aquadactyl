<?php

use Pterodactyl\Models\User;

test('non admin cannot access endpoint', function () {
    $this->actingAs(User::factory()->create())
        ->delete(route('admin.users.delete', ['user' => User::factory()->create()]))
        ->assertForbidden();
});

test('cannot delete self', function () {
    $this->actingAs($user = User::factory()->admin()->create())
        ->delete(route('admin.users.delete', ['user' => $user]))
        ->assertBadRequest()
        ->assertJsonPath('errors.0.detail', __('admin/user.exceptions.delete_self'));

    $this->assertModelExists($user);
});

test('user is deleted', function () {
    $user = User::factory()->create();

    $this->actingAs(User::factory()->admin()->create())
        ->delete(route('admin.users.delete', ['user' => $user]))
        ->assertRedirectToRoute('admin.users');

    $this->assertModelMissing($user);
});
