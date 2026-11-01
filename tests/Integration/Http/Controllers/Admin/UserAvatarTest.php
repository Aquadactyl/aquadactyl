<?php

use Pterodactyl\Models\User;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
    $this->user = User::factory()->create(['avatar' => 'avatars/target.png']);
    Storage::disk('public')->put('avatars/target.png', 'target-image');
});

test('only admins can remove another user profile picture', function () {
    $this->actingAs(User::factory()->create())->delete('/admin/users/view/' . $this->user->id . '/avatar')->assertForbidden();
    expect($this->user->fresh()->avatar)->toBe('avatars/target.png');
    Storage::disk('public')->assertExists('avatars/target.png');
});

test('admins can moderate pictures with uploads disabled and retain other accounts', function () {
    config()->set('aquadactyl.features.custom_profile_pictures', false);
    $other = User::factory()->create(['avatar' => 'avatars/other.png']);
    Storage::disk('public')->put('avatars/other.png', 'other-image');
    $this->actingAs(User::factory()->create(['root_admin' => true]))->get('/admin/users/view/' . $this->user->id)->assertOk()->assertSee('Remove profile picture');
    $this->delete('/admin/users/view/' . $this->user->id . '/avatar')->assertRedirect('/admin/users/view/' . $this->user->id);
    expect($this->user->fresh()->avatar)->toBeNull()->and($other->fresh()->avatar)->toBe('avatars/other.png');
    Storage::disk('public')->assertMissing('avatars/target.png');
    Storage::disk('public')->assertExists('avatars/other.png');
    $this->assertActivityLogged('admin:user.avatar-removed');
    $this->get('/admin/users/view/' . $this->user->id)->assertOk()->assertSee('This user has no uploaded profile picture.')->assertDontSee('Remove profile picture');
});
