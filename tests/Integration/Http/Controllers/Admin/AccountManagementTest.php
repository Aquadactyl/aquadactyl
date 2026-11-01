<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\ApiKey;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Helpers\SoftwareVersionService;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set('pterodactyl.auth.2fa_required', 0);
    app('cache')->forever(SoftwareVersionService::VERSION_CACHE_KEY, ['panel' => '1.0.0', 'wings' => '1.0.0']);
    $this->admin = User::factory()->create(['root_admin' => true]);
    $this->actingAs($this->admin);
    Notification::fake();
});

test('administrators can update an account and search its email without disclosing credentials', function () {
    $user = User::factory()->create();
    $payload = ['email' => 'changed@example.test', 'username' => 'changed-user', 'name_first' => 'Changed', 'name_last' => 'User', 'root_admin' => 0, 'language' => 'fr', 'password' => 'ChangedPassword123!'];
    $this->patch('/admin/users/view/' . $user->id, $payload)->assertRedirect(route('admin.users.view', $user->id));
    expect($user->fresh()->language)->toBe('fr')->and(Hash::check($payload['password'], $user->fresh()->password))->toBeTrue();
    $this->getJson('/admin/users/accounts.json?filter[email]=changed')->assertOk()->assertJsonPath('0.id', $user->id)->assertJsonPath('0.md5', md5($payload['email']))->assertJsonMissingPath('0.password');
    $this->getJson('/admin/users/accounts.json?user_id=' . $user->id)->assertOk()->assertJsonPath('id', $user->id)->assertJsonPath('md5', md5($payload['email']))->assertJsonMissingPath('password');
});

test('application keys persist resource permissions and revocation cannot remove a client key', function () {
    $this->post('/admin/api/new', ['memo' => 'Coverage integration', 'r_nodes' => 1, 'r_servers' => 3])->assertRedirect(route('admin.api.index'));
    $key = ApiKey::where('memo', 'Coverage integration')->firstOrFail();
    expect($key->key_type)->toBe(ApiKey::TYPE_APPLICATION)->and($key->user_id)->toBe($this->admin->id)->and($key->r_nodes)->toBe(1)->and($key->r_servers)->toBe(3);
    $client = ApiKey::factory()->create(['key_type' => ApiKey::TYPE_ACCOUNT, 'user_id' => $this->admin->id]);
    $this->get('/admin/api')->assertOk()->assertSee('Coverage integration');
    $this->delete('/admin/api/revoke/' . $client->identifier)->assertNoContent();
    $this->assertDatabaseHas('api_keys', ['id' => $client->id]);
    $this->delete('/admin/api/revoke/' . $key->identifier)->assertNoContent();
    $this->assertDatabaseMissing('api_keys', ['id' => $key->id]);
});

test('application key creation rejects unknown permission levels', function () {
    $this->post('/admin/api/new', ['memo' => 'Invalid permissions', 'r_servers' => 9])->assertUnprocessable();
});
