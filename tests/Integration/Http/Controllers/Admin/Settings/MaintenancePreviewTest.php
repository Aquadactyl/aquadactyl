<?php

use Pterodactyl\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Event;
use Pterodactyl\Events\Auth\DirectLogin;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set(['pterodactyl.auth.2fa_required' => 0, 'aquadactyl.maintenance.enabled' => false, 'recaptcha.enabled' => false]);
    $this->admin = User::factory()->create(['root_admin' => true, 'use_totp' => false]);
});

test('only administrators can preview maintenance and previewing never enables it', function () {
    $this->actingAs(User::factory()->create(['root_admin' => false]))->getJson('/admin/settings/maintenance/preview')->assertForbidden();
    $this->actingAs($this->admin)->get('/admin/settings/maintenance/preview')->assertOk()->assertSee('This preview does not change maintenance mode.')
        ->assertSee('href="/auth/login"', false)->assertSee('aquadactyl-wordmark.png')->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    expect(config('aquadactyl.maintenance.enabled'))->toBeFalse();
    $this->get('/admin/settings')->assertOk()->assertSee('id="maintenance-preview"', false);
});

test('maintenance preview accepts an unsaved message preserves newlines and escapes markup', function () {
    config()->set('aquadactyl.maintenance.message', 'Saved maintenance message');
    $this->actingAs($this->admin)->get('/admin/settings/maintenance/preview?' . http_build_query(['message' => "Back at 18:00\n<script>alert(1)</script>"]))
        ->assertOk()->assertSee("Back at 18:00\n&lt;script&gt;alert(1)&lt;/script&gt;", false)->assertDontSee('<script>alert(1)', false)->assertDontSee('Saved maintenance message');
    expect(config('aquadactyl.maintenance.message'))->toBe('Saved maintenance message');
});

test('preview defaults to the saved message and clearing an unsaved message uses the translated fallback', function () {
    config()->set('aquadactyl.maintenance.message', 'Saved maintenance message');
    $this->actingAs($this->admin)->get('/admin/settings/maintenance/preview')->assertOk()->assertSee('Saved maintenance message');
    $this->get('/admin/settings/maintenance/preview?message=')->assertOk()->assertSee('temporarily unavailable')->assertDontSee('Saved maintenance message');
});

test('preview rejects oversized and non text messages', function (array $query) {
    $this->actingAs($this->admin)->getJson('/admin/settings/maintenance/preview?' . http_build_query($query))->assertUnprocessable();
})->with([[['message' => str_repeat('x', 1001)]], [['message' => ['invalid']]]]);

test('maintenance renders appearance settings without exposing unsafe logo or background paths', function (bool $customLogo) {
    $logo = 'branding/12345678-1234-1234-1234-123456789abc.png';
    $background = 'backgrounds/login/12345678-1234-1234-1234-123456789abc.png';
    config()->set([
        'app.name' => 'Custom Panel', 'aquadactyl.appearance.primary_color' => '#a85cf4',
        'aquadactyl.branding.logo_path' => $customLogo ? $logo : 'https://untrusted.example/logo.png',
        'aquadactyl.branding.show_name' => true,
        'aquadactyl.appearance.login_background_path' => $customLogo ? $background : 'https://untrusted.example/background.png',
        'aquadactyl.appearance.login_blur' => 12, 'aquadactyl.appearance.login_overlay' => 75,
    ]);
    $response = $this->actingAs($this->admin)->get('/admin/settings/maintenance/preview')->assertOk()->assertSee('Custom Panel')->assertSee('--aqua-primary: #a85cf4;', false)->assertDontSee('https://untrusted.example');
    if ($customLogo) {
        $response->assertSee('/storage/' . $logo, false)->assertSee('/storage/' . $background, false)->assertSee('blur(12px)', false)->assertSee('75%', false);
    } else {
        $response->assertSee('aquadactyl-emblem.png');
    }
})->with([true, false]);

test('guests get themed maintenance while administrators can still sign in and manage settings', function () {
    Event::fake([DirectLogin::class]);
    $this->admin->update(['password' => Hash::make('TestingPassword123!')]);
    config()->set(['aquadactyl.maintenance.enabled' => true, 'aquadactyl.maintenance.message' => 'Back soon']);
    $response = $this->get('/', ['Accept' => 'text/html'])->assertStatus(503)->assertSee('Back soon')->assertSee('maintenance.css')->assertSee('href="/auth/login"', false)->assertDontSee('This preview does not change maintenance mode.');
    expect($response->headers->get('Cache-Control'))->toContain('no-store');
    $response->assertHeader('Retry-After', '60');
    $this->get('/auth/login')->assertOk();
    $this->postJson('/auth/login', ['user' => $this->admin->email, 'password' => 'TestingPassword123!'])->assertOk()->assertJsonPath('data.complete', true);
    $this->assertAuthenticatedAs($this->admin);
    $this->get('/admin/settings')->assertOk();
    $this->get('/admin/settings/maintenance/preview')->assertOk();
});

test('non administrators remain blocked after logging in during maintenance', function () {
    config()->set('aquadactyl.maintenance.enabled', true);
    $this->actingAs(User::factory()->create(['root_admin' => false]))->getJson('/api/client')->assertStatus(503)->assertJsonPath('errors.0.code', 'PanelMaintenance');
});
