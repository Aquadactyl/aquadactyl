<?php

use Pterodactyl\Models\User;

test('non admin cannot access endpoint', function () {
    $this->actingAs(User::factory()->create())
        ->post('/admin/users/new', [
            'email' => 'test@example.com',
            'username' => 'testuser',
            'name_first' => 'Test',
            'name_last' => 'User',
        ])
        ->assertForbidden();
});

test('creating administrator account is logged', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->post('/admin/users/new', [
            'email' => 'created.admin@example.com',
            'username' => 'createdadmin',
            'name_first' => 'Created',
            'name_last' => 'Admin',
            'root_admin' => 1,
        ])
        ->assertSessionHasNoErrors();

    /** @var User $created */
    $created = User::query()->where('username', 'createdadmin')->firstOrFail();
    expect($created->root_admin)->toBeTrue();

    $this->assertActivityFor('user:user.create', $admin, $created);
});
