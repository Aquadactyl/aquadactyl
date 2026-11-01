<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Setting;
use Pterodactyl\Notifications\MailTested;
use Illuminate\Support\Facades\Notification;
use Pterodactyl\Providers\SettingsServiceProvider;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

beforeEach(function () {
    config()->set('pterodactyl.load_environment_only', false);
    config()->set('mail.default', 'smtp');
    config()->set('services.mailgun.secret', null);
    config()->set('services.postmark.token', null);
    config()->set('services.ses.key', null);
    config()->set('services.ses.secret', null);
    $this->admin = User::factory()->create(['root_admin' => true]);
    $this->sender = ['mail:from:address' => 'sender@example.test', 'mail:from:name' => 'Test Panel'];
});

afterEach(function () {
    foreach (Setting::query()->where('key', 'like', 'settings::mail:%')->orWhere('key', 'like', 'settings::services:%')->pluck('key') as $key) {
        app(SettingsRepositoryInterface::class)->forget($key);
    }
});

test('only administrators can configure or test a mail service', function () {
    $this->actingAs(User::factory()->create())->get('/admin/settings/mail')->assertForbidden();
    $this->patchJson('/admin/settings/mail', ['mail:default' => 'log', ...$this->sender])->assertForbidden();
    $this->post('/admin/settings/mail/test')->assertForbidden();
});

test('API mail services save encrypted secrets and instantiate their transports', function (string $driver, array $fields, string $transportClass) {
    $this->actingAs($this->admin)->patchJson('/admin/settings/mail', ['mail:default' => $driver, ...$this->sender, ...$fields])->assertNoContent();
    foreach ($fields as $key => $value) {
        if (in_array($key, SettingsServiceProvider::getEncryptedKeys(), true)) {
            $saved = Setting::query()->where('key', 'settings::' . $key)->value('value');
            expect($saved)->not->toBe($value)->and(app('encrypter')->decrypt($saved))->toBe($value);
        }
    }
    app()->call([new SettingsServiceProvider(app()), 'boot']);
    expect(config('mail.default'))->toBe($driver);
    app('mail.manager')->purge($driver);
    expect(app('mail.manager')->mailer($driver)->getSymfonyTransport())->toBeInstanceOf($transportClass);
    $response = $this->get('/admin/settings/mail')->assertOk();
    foreach ($fields as $key => $value) {
        if (in_array($key, SettingsServiceProvider::getEncryptedKeys(), true)) {
            $response->assertDontSee($value);
        }
    }
    $blank = array_map(fn ($value, $key) => in_array($key, SettingsServiceProvider::getEncryptedKeys(), true) ? '' : $value, $fields, array_keys($fields));
    $this->patchJson('/admin/settings/mail', ['mail:default' => $driver, ...$this->sender, ...array_combine(array_keys($fields), $blank)])->assertNoContent();
})->with([
    ['mailgun', ['services:mailgun:domain' => 'mg.example.test', 'services:mailgun:secret' => 'mailgun-secret-proof', 'services:mailgun:endpoint' => 'api.eu.mailgun.net'], Symfony\Component\Mailer\Bridge\Mailgun\Transport\MailgunHttpTransport::class],
    ['postmark', ['services:postmark:token' => 'postmark-token-proof', 'mail:mailers:postmark:message_stream_id' => 'outbound'], Symfony\Component\Mailer\Bridge\Postmark\Transport\PostmarkApiTransport::class],
    ['ses', ['services:ses:key' => 'aws-key-proof', 'services:ses:secret' => 'aws-secret-proof', 'services:ses:region' => 'eu-west-2'], Illuminate\Mail\Transport\SesTransport::class],
]);

test('switching mail services ignores inactive fields and retains credentials', function () {
    $this->actingAs($this->admin)->patchJson('/admin/settings/mail', ['mail:default' => 'postmark', ...$this->sender, 'services:postmark:token' => 'keep-token', 'mail:mailers:postmark:message_stream_id' => 'outbound'])->assertNoContent();
    $this->patchJson('/admin/settings/mail', ['mail:default' => 'log', ...$this->sender, 'services:postmark:token' => 'injected-replacement'])->assertNoContent();
    expect(app('encrypter')->decrypt(Setting::query()->where('key', 'settings::services:postmark:token')->value('value')))->toBe('keep-token');
});

test('missing API credentials invalid regions and unsupported services are rejected', function (array $fields) {
    $this->actingAs($this->admin)->patchJson('/admin/settings/mail', [...$this->sender, ...$fields])->assertUnprocessable();
})->with([
    [['mail:default' => 'postmark', 'services:postmark:token' => '', 'mail:mailers:postmark:message_stream_id' => 'outbound']],
    [['mail:default' => 'mailgun', 'services:mailgun:domain' => 'mg.example.test', 'services:mailgun:secret' => 'key', 'services:mailgun:endpoint' => 'internal.example.test']],
    [['mail:default' => 'ses', 'services:ses:key' => 'key', 'services:ses:secret' => 'secret', 'services:ses:region' => 'invalid']],
    [['mail:default' => 'unsupported']], [['mail:default' => ['postmark']]],
]);

test('mail validation does not flash credentials', function () {
    $this->actingAs($this->admin)->withHeader('Accept', 'text/html')->from('/admin/settings/mail')->patch('/admin/settings/mail', [
        'mail:default' => 'postmark', 'mail:from:address' => 'invalid', 'services:postmark:token' => 'do-not-flash', 'mail:mailers:postmark:message_stream_id' => 'outbound',
    ])->assertRedirect('/admin/settings/mail')->assertSessionMissing('_old_input.services:postmark:token');
});

test('mail test targets the signed in administrator and hides transport exception credentials', function () {
    Notification::fake();
    $this->actingAs($this->admin)->post('/admin/settings/mail/test')->assertNoContent();
    Notification::assertSentOnDemand(MailTested::class, fn ($notification, $channels, $notifiable) => $notifiable->routes['mail'] === $this->admin->email);
    Notification::shouldReceive('route')->andThrow(new RuntimeException('secret-token https://private-token@mail.example.test'));
    $this->post('/admin/settings/mail/test')->assertStatus(500)->assertDontSee('secret-token')->assertDontSee('private-token');
});

test('environment only mode cannot save mail settings', function () {
    config()->set('pterodactyl.load_environment_only', true);
    $this->actingAs($this->admin)->patchJson('/admin/settings/mail', ['mail:default' => 'log', ...$this->sender])->assertStatus(400);
});

test('SMTP TLS choices map to the current transport flags and blank password is preserved', function (string $encryption, string $scheme, bool $requireTls) {
    $settings = ['mail:default' => 'smtp', ...$this->sender, 'mail:mailers:smtp:host' => 'smtp.example.test', 'mail:mailers:smtp:port' => 587, 'mail:mailers:smtp:encryption' => $encryption, 'mail:mailers:smtp:username' => 'test', 'mail:mailers:smtp:password' => 'smtp-proof'];
    $this->actingAs($this->admin)->patchJson('/admin/settings/mail', $settings)->assertNoContent();
    app()->call([new SettingsServiceProvider(app()), 'boot']);
    expect(config('mail.mailers.smtp.scheme'))->toBe($scheme)->and(config('mail.mailers.smtp.require_tls'))->toBe($requireTls);
    $this->patchJson('/admin/settings/mail', [...$settings, 'mail:mailers:smtp:password' => ''])->assertNoContent();
    expect(app('encrypter')->decrypt(Setting::query()->where('key', 'settings::mail:mailers:smtp:password')->value('value')))->toBe('smtp-proof');
})->with([['tls', 'smtp', true], ['ssl', 'smtps', false], ['', 'smtp', false]]);

test('SMTP passwords resembling environment values stay literal strings', function (string $password) {
    $settings = ['mail:default' => 'smtp', ...$this->sender, 'mail:mailers:smtp:host' => 'smtp.example.test', 'mail:mailers:smtp:port' => 587, 'mail:mailers:smtp:encryption' => 'tls', 'mail:mailers:smtp:password' => $password];
    $this->actingAs($this->admin)->patchJson('/admin/settings/mail', $settings)->assertNoContent();
    app()->call([new SettingsServiceProvider(app()), 'boot']);
    expect(config('mail.mailers.smtp.password'))->toBe($password);
})->with(['0', 'false', 'true', 'null']);

test('administrators can explicitly clear an SMTP password using the supported empty sentinel', function () {
    $this->actingAs($this->admin)->patchJson('/admin/settings/mail', ['mail:default' => 'smtp', ...$this->sender, 'mail:mailers:smtp:host' => 'smtp.example.test', 'mail:mailers:smtp:port' => 587, 'mail:mailers:smtp:encryption' => 'tls', 'mail:mailers:smtp:password' => '!e'])->assertNoContent();
    expect(Setting::where('key', 'settings::mail:mailers:smtp:password')->value('value'))->toBe('');
});
