<?php

use Illuminate\Support\Js;
use Pterodactyl\Models\User;
use Illuminate\Support\Facades\Notification;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set('pterodactyl.auth.2fa_required', 0);
    Notification::fake();
});

test('registered account input stays text in admin listings details and the client bootstrap', function (string $payload) {
    config()->set('aquadactyl.features.registration', true);
    $suffix = bin2hex(random_bytes(5));
    $this->postJson(route('auth.post.register'), ['username' => 'safe-' . $suffix, 'email' => 'safe-' . $suffix . '@example.test',
        'name_first' => $payload, 'name_last' => $payload, 'password' => 'test-password-123', 'password_confirmation' => 'test-password-123', 'root_admin' => true,
    ])->assertOk();
    $user = User::where('username', 'safe-' . $suffix)->firstOrFail();
    expect($user->name_first)->toBe($payload)->and($user->root_admin)->toBeFalse();
    $this->get('/')->assertOk()->assertSee('"name_first":' . Js::encode($payload), false)->assertDontSee($payload, false);
    $admin = User::factory()->create(['root_admin' => true]);
    $this->actingAs($admin)->withSession(['password_hash_web' => $admin->getAuthPassword()])
        ->get('/admin/users?filter[email]=' . urlencode($user->email))->assertOk()->assertSee(e($payload), false)->assertDontSee($payload, false);
    $this->get('/admin/users/view/' . $user->id)->assertOk()->assertSee(e($payload), false)->assertDontSee($payload, false);
})->with([
    '</script><script>window.untrusted=true</script>',
    '"><img src=x onerror="window.untrusted=true">',
    '<!--<script>',
]);

test('old malicious names and real names with quotes and Unicode survive the owner selector without becoming code', function () {
    $name = "O'Connor \\ & <script>window.untrusted=true</script> \u{2028} Grüße";
    $user = User::factory()->create(['name_first' => $name, 'name_last' => $name]);
    $server = $this->createServerModel(['owner_id' => $user->id, 'status' => null]);
    $admin = User::factory()->create(['root_admin' => true]);
    $this->actingAs($admin)->get('/admin/servers/view/' . $server->id . '/details')->assertOk()
        ->assertSee('name_first: ' . Js::from($name), false)->assertDontSee('<script>window.untrusted=true', false);
});

test('server creation restores old form values using JavaScript encoding and lookup by literal element ID', function () {
    $server = $this->createServerModel(['status' => null]);
    $payload = "\"';</script><script>window.untrusted=true</script>\\";
    $this->actingAs(User::factory()->create(['root_admin' => true]))->withSession(['_old_input' => [
        'egg_id' => (string) $server->egg_id, 'environment' => ['TEST_VALUE' => $payload], 'image' => $payload,
        'owner_id' => $payload, 'node_id' => $payload, 'allocation_id' => $payload, 'allocation_additional' => [$payload], 'nest_id' => $payload,
    ]])->get('/admin/servers/new')->assertOk()->assertSee('document.getElementById(ids[key])', false)
        ->assertSee(Js::from(['TEST_VALUE' => $payload]), false)->assertDontSee($payload, false);
});

test('panel branding cannot terminate the client settings script', function () {
    $payload = '<!--<script></script><img src=x onerror=untrusted()>';
    config()->set('app.name', $payload);
    $this->get('/')->assertOk()->assertSee('"name":' . Js::encode($payload), false)->assertDontSee($payload, false);
});
