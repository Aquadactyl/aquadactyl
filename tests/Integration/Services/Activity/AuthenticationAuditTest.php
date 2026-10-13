<?php

use Pterodactyl\Models\User;
use Illuminate\Auth\Events\Failed;
use Pterodactyl\Models\ActivityLog;
use Pterodactyl\Events\Server\Installed;
use Illuminate\Auth\Events\PasswordReset;
use Pterodactyl\Listeners\TwoFactorListener;
use Pterodactyl\Notifications\ServerInstalled;
use Pterodactyl\Listeners\AuthenticationListener;
use Illuminate\Contracts\Notifications\Dispatcher;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Events\Auth\ProvidedAuthenticationToken;

uses(DatabaseTransactions::class);

test('failed authentication audits keep account attribution while excluding credential secrets', function () {
    $user = User::factory()->create();
    app(AuthenticationListener::class)->login(new Failed('web', $user, ['username' => $user->username, 'password' => 'private-password', 'token' => 'private-token']));
    $log = ActivityLog::forEvent('auth:fail')->latest('id')->firstOrFail();
    expect($log->properties->get('username'))->toBe($user->username);
    expect($log->properties->toJson())->not->toContain('private-password', 'private-token');
    expect($log->subjects->first()->subject_id)->toBe($user->id);
    app(AuthenticationListener::class)->reset(new PasswordReset($user));
    expect(ActivityLog::forEvent('event:password-reset')->count())->toBe(1);
});

test('two-factor audits distinguish regular tokens from recovery tokens without retaining them', function (bool $recovery) {
    $user = User::factory()->create();
    app(TwoFactorListener::class)(new ProvidedAuthenticationToken($user, $recovery));
    $log = ActivityLog::forEvent($recovery ? 'auth:recovery-token' : 'auth:token')->firstOrFail();
    expect($log->subjects->first()->subject_id)->toBe($user->id);
})->with([true, false]);

test('server installation notifications address the owner and include the correct server name', function () {
    $server = $this->createServerModel();
    $notification = new ServerInstalled();
    $dispatcher = $this->mock(Dispatcher::class);
    $dispatcher->shouldReceive('sendNow')->once()->with(Mockery::on(fn ($user) => $user->id === $server->owner_id), $notification);
    $notification->handle(new Installed($server));
    expect($notification->via())->toBe(['mail']);
    $mail = $notification->toMail();
    expect($mail->greeting)->toContain($server->user->username)->and(implode(' ', $mail->introLines))->toContain($server->name);
    expect($mail->actionUrl)->toBe(route('index'));
});
