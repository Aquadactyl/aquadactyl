<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\ActivityLog;
use Illuminate\Support\Facades\Queue;
use Pterodactyl\Jobs\SyncAccountSuspension;
use Pterodactyl\Services\Servers\SuspensionService;
use Pterodactyl\Services\Users\UserSuspensionService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Repositories\Wings\DaemonServerRepository;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set(['pterodactyl.auth.2fa_required' => 0, 'recaptcha.enabled' => false]);
    Queue::fake();
    $this->admin = User::factory()->create(['root_admin' => true]);
    $this->user = User::factory()->create(['root_admin' => false]);
    $this->service = app(UserSuspensionService::class);
});

test('user suspension and restoration preserve independent manual server suspensions', function () {
    $server = $this->createServerModel(['owner_id' => $this->user->id, 'status' => null]);
    $manual = $this->createServerModel(['owner_id' => $this->user->id, 'status' => Server::STATUS_SUSPENDED]);
    $unrelated = $this->createServerModel(['status' => null]);
    $this->service->set($this->user, $this->admin, true, 'Review requested');
    expect($this->user->fresh()->suspended_at)->not->toBeNull();
    expect($server->fresh()->isSuspended())->toBeTrue()->and($server->fresh()->status)->toBeNull()->and($server->fresh()->account_suspension_pending)->toBeTrue();
    expect($manual->fresh()->account_suspended)->toBeTrue()->and($unrelated->fresh()->isSuspended())->toBeFalse();
    $this->service->set($this->user, $this->admin, false, null);
    expect($this->user->fresh()->suspended_at)->toBeNull()->and($server->fresh()->isSuspended())->toBeFalse()->and($manual->fresh()->isSuspended())->toBeTrue();
    expect(ActivityLog::forEvent('admin:user.suspended')->count())->toBe(1)->and(ActivityLog::forEvent('admin:user.restored')->count())->toBe(1);
});

test('suspension requires a fresh admin password and non administrators cannot use it', function (string $case) {
    $this->actingAs($case === 'permission' ? $this->user : $this->admin)->postJson('/admin/users/view/' . $this->user->id . '/suspension', ['suspend' => '1', 'current_password' => 'incorrect'])->assertStatus($case === 'permission' ? 403 : 422);
})->with(['permission', 'password']);

test('self suspension and suspended or revoked administrators are rejected', function (string $case) {
    if ($case === 'revoked') {
        $this->admin->update(['root_admin' => false]);
    } elseif ($case === 'suspended') {
        $this->admin->forceFill(['suspended_at' => now()])->save();
    }
    expect(fn () => $this->service->set($case === 'self' ? $this->admin : $this->user, $this->admin, true, null))->toThrow(Illuminate\Validation\ValidationException::class);
    expect($this->user->fresh()->suspended_at)->toBeNull();
})->with(['self', 'revoked', 'suspended']);

test('the administrator can reversibly suspend an account from its user page', function () {
    $this->actingAs($this->admin)->get('/admin/users/view/' . $this->user->id)->assertOk()->assertSee('Suspend user and owned servers');
    $this->post('/admin/users/view/' . $this->user->id . '/suspension', ['suspend' => '1', 'current_password' => 'password', 'reason' => '<script>review</script>'])->assertRedirect();
    $this->get('/admin/users/view/' . $this->user->id)->assertOk()->assertSee('&lt;script&gt;review&lt;/script&gt;', false)->assertSee('Restore user access');
    $this->post('/admin/users/view/' . $this->user->id . '/suspension', ['suspend' => '0', 'current_password' => 'password'])->assertRedirect();
    expect($this->user->fresh()->suspended_at)->toBeNull();
});

test('daemon failure leaves the suspension authoritative and retries remain durable', function () {
    $server = $this->createServerModel(['owner_id' => $this->user->id, 'status' => null]);
    $this->service->set($this->user, $this->admin, true, null);
    $this->mock(DaemonServerRepository::class)->shouldReceive('setServer')->once()->andReturnSelf()->shouldReceive('sync')->once()->andThrow(new RuntimeException('private-token'));
    $this->service->sync($server->id);
    expect($server->fresh()->isSuspended())->toBeTrue()->and($server->fresh()->account_suspension_pending)->toBeTrue()->and($server->fresh()->account_suspension_error)->not->toContain('private-token');
    $this->artisan('p:users:sync-suspensions')->assertSuccessful();
    Queue::assertPushed(SyncAccountSuspension::class, fn ($job) => $job->serverId === $server->id);
});

test('successful daemon synchronization clears pending flags and jobs tolerate deleted servers', function () {
    $server = $this->createServerModel(['owner_id' => $this->user->id, 'status' => null]);
    $this->service->set($this->user, $this->admin, true, null);
    $this->mock(DaemonServerRepository::class)->shouldReceive('setServer')->once()->andReturnSelf()->shouldReceive('sync')->once();
    (new SyncAccountSuspension($server->id))->handle($this->service);
    expect($server->fresh()->account_suspension_pending)->toBeFalse()->and($server->fresh()->account_suspended)->toBeTrue();
    $this->service->sync($server->id);
    $this->service->sync(99999999);
});

test('server ownership changes and newly created servers inherit account restrictions', function () {
    $this->service->set($this->user, $this->admin, true, null);
    $new = $this->createServerModel(['owner_id' => $this->user->id]);
    expect($new->account_suspended)->toBeTrue();
    $existing = $this->createServerModel(['status' => null]);
    $existing->update(['owner_id' => $this->user->id]);
    expect($existing->refresh()->account_suspended)->toBeTrue()->and($existing->account_suspension_pending)->toBeTrue();
    $existing->update(['owner_id' => $this->admin->id]);
    expect($existing->refresh()->account_suspended)->toBeFalse();
});

test('manual unsuspension cannot bypass a user account suspension', function () {
    $server = $this->createServerModel(['owner_id' => $this->user->id, 'status' => null]);
    $this->service->set($this->user, $this->admin, true, null);
    expect(fn () => app(SuspensionService::class)->toggle($server->fresh(), SuspensionService::ACTION_UNSUSPEND))->toThrow(Symfony\Component\HttpKernel\Exception\ConflictHttpException::class);
});

test('suspended users cannot use active sessions client APIs or application APIs', function (string $path, bool $html) {
    $this->user->forceFill(['root_admin' => true, 'suspended_at' => now()])->save();
    $response = $this->actingAs($this->user)->get($path, ['Accept' => $html ? 'text/html' : 'application/json'])->assertForbidden();
    if ($html) {
        $response->assertSee('Account suspended')->assertDontSee('Game servers continue running');
    } else {
        $response->assertJsonPath('errors.0.code', 'AccountSuspended');
    }
})->with([['/', true], ['/api/client', false], ['/api/application/users', false]]);

test('suspended password sign in does not create a session or a two factor checkpoint', function (bool $twoFactor) {
    $this->user->forceFill(['suspended_at' => now(), 'use_totp' => $twoFactor])->save();
    $this->postJson('/auth/login', ['user' => $this->user->email, 'password' => 'password'])->assertBadRequest();
    $this->assertGuest();
    expect(session()->get('auth_confirmation_token'))->toBeNull();
})->with([true, false]);

test('a checkpoint started before suspension cannot finish after suspension', function () {
    $secret = str_repeat('a', 16);
    $this->user->forceFill(['suspended_at' => now(), 'use_totp' => true, 'totp_secret' => encrypt($secret)])->save();
    session()->put('auth_confirmation_token', ['user_id' => $this->user->id, 'token_value' => 'pending-token', 'expires_at' => now()->addMinutes(5)]);
    $code = app(PragmaRX\Google2FA\Google2FA::class)->getCurrentOtp($secret);
    $this->postJson('/auth/login/checkpoint', ['confirmation_token' => 'pending-token', 'authentication_code' => $code])->assertBadRequest();
    $this->assertGuest();
});

test('password recovery changes credentials without signing a suspended user in', function () {
    Illuminate\Support\Facades\Notification::fake();
    $this->user->forceFill(['suspended_at' => now()])->save();
    $token = Illuminate\Support\Facades\Password::broker()->createToken($this->user);
    $this->postJson('/auth/password/reset', ['email' => $this->user->email, 'token' => $token, 'password' => 'NewTestingPassword123!', 'password_confirmation' => 'NewTestingPassword123!'])->assertOk()->assertJsonPath('send_to_login', true);
    $this->assertGuest();
});

test('suspension blocks stateless bearer API access without deleting the API key', function () {
    $key = $this->user->createToken('suspension fixture', []);
    $this->user->forceFill(['suspended_at' => now()])->save();
    $this->withHeader('Authorization', 'Bearer ' . $key->accessToken->identifier . $key->plainTextToken)->getJson('/api/client')->assertForbidden()->assertJsonPath('errors.0.code', 'AccountSuspended');
});

test('suspended account credentials are rejected by daemon SFTP authentication', function () {
    $server = $this->createServerModel(['owner_id' => $this->user->id, 'status' => null]);
    $this->user->forceFill(['suspended_at' => now()])->save();
    $this->withHeader('Authorization', 'Bearer ' . $server->node->daemon_token_id . '.' . decrypt($server->node->daemon_token))
        ->postJson('/api/remote/sftp/auth', ['username' => $this->user->username . '.' . substr($server->uuid, 0, 8), 'password' => 'password'])->assertForbidden();
});

test('suspension synchronization waits for active transfers without losing the desired state', function () {
    $server = $this->createServerModel(['owner_id' => $this->user->id, 'status' => null]);
    Pterodactyl\Models\ServerTransfer::create(['server_id' => $server->id, 'old_node' => $server->node_id, 'new_node' => $server->node_id, 'old_allocation' => $server->allocation_id, 'new_allocation' => $server->allocation_id]);
    $this->service->set($this->user, $this->admin, true, null);
    $this->mock(DaemonServerRepository::class)->shouldNotReceive('setServer');
    $this->service->sync($server->id);
    expect($server->fresh()->account_suspension_pending)->toBeTrue()->and($server->fresh()->isSuspended())->toBeTrue();
    $this->actingAs($this->admin)->get('/admin/users/view/' . $this->user->id)->assertOk()->assertSee('waiting for daemon synchronization')->assertSee('Check node connectivity');
});

test('changes made during daemon synchronization remain queued for another sync', function () {
    $server = $this->createServerModel(['owner_id' => $this->user->id, 'status' => null]);
    $this->service->set($this->user, $this->admin, true, null);
    $this->mock(DaemonServerRepository::class)->shouldReceive('setServer')->once()->andReturnSelf()->shouldReceive('sync')->once()->andReturnUsing(function () use ($server) {
        Server::whereKey($server->id)->update(['account_suspended' => false, 'account_suspension_pending' => true]);
    });
    $this->service->sync($server->id);
    expect($server->fresh()->account_suspension_pending)->toBeTrue();
});

test('retries deduplicate server jobs and an existing job uses the latest account state', function () {
    $server = $this->createServerModel(['owner_id' => $this->user->id, 'status' => null]);
    $this->service->set($this->user, $this->admin, true, null);
    $this->service->retryPending();
    $this->service->retryPending();
    Queue::assertPushed(SyncAccountSuspension::class, 1);
    $this->service->set($this->user, $this->admin, false, null);
    $this->mock(DaemonServerRepository::class)->shouldReceive('setServer')->once()->with(Mockery::on(fn ($current) => !$current->account_suspended))->andReturnSelf()->shouldReceive('sync')->once();
    (new SyncAccountSuspension($server->id))->handle($this->service);
    expect($server->fresh()->account_suspension_pending)->toBeFalse();
});
