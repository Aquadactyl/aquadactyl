<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Setting;
use Pterodactyl\Models\Location;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Notification;
use Pterodactyl\Providers\SettingsServiceProvider;
use Pterodactyl\Services\Settings\SiteLogoService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

uses(DatabaseTransactions::class);

beforeEach(function () {
    app()->instance(Illuminate\Contracts\Debug\ExceptionHandler::class, new class(app()) extends Pterodactyl\Exceptions\Handler {
        public function render($request, Throwable $e): Symfony\Component\HttpFoundation\Response
        {
            return (new ReflectionMethod(Illuminate\Foundation\Exceptions\Handler::class, 'render'))->invoke($this, $request, $e);
        }
    });
    config()->set(['pterodactyl.auth.2fa_required' => 0, 'pterodactyl.load_environment_only' => false, 'aquadactyl.setup.completed' => true]);
    Storage::fake('public');
    Notification::fake();
    $this->admin = User::factory()->create(['root_admin' => true, 'password' => Hash::make('CurrentSecret123!')]);
    $this->actingAs($this->admin);
    $this->branding = ['name' => 'My Panel', 'primary_color' => '#A85CF4'];
    $this->account = ['username' => 'setup_additional_admin', 'email' => 'setup-admin@example.invalid', 'name_first' => 'Additional', 'name_last' => 'Admin', 'password' => 'NewAdmin123!', 'password_confirmation' => 'NewAdmin123!', 'current_password' => 'CurrentSecret123!'];
});

afterEach(function () {
    foreach (['app:name', 'aquadactyl:appearance:primary_color', 'aquadactyl:branding:logo_path', 'aquadactyl:setup:completed'] as $key) {
        app(SettingsRepositoryInterface::class)->forget('settings::' . $key);
    }
});

test('all setup stages are translated and can be revisited after completion', function (string $locale) {
    $this->admin->update(['language' => $locale]);
    foreach (['branding', 'node', 'admins', 'finish'] as $step) {
        $this->get('/admin/settings/setup?step=' . $step)->assertOk()->assertSee('setup-wizard')->assertDontSee('>setup.', false);
    }
    $this->get('/admin/settings/setup?step=unknown')->assertNotFound();
})->with(['en', 'fr', 'de']);

test('new panels prompt only administrators on HTML entry pages and completing stops it panel wide', function () {
    config()->set('aquadactyl.setup.completed', false);
    $this->withHeaders(['Accept' => 'text/html'])->get('/')->assertRedirect('/admin/settings/setup');
    $this->get('/admin')->assertRedirect('/admin/settings/setup');
    $this->get('/admin/settings/setup')->assertOk();
    $this->get('/account')->assertOk();
    $this->getJson('/')->assertOk();
    $this->post('/admin/settings/setup/complete')->assertRedirect('/admin')->assertHeader('Location', '/admin');
    app()->call([new SettingsServiceProvider(app()), 'boot']);
    expect(config('aquadactyl.setup.completed'))->toBeTrue();
    $this->get('/')->assertOk();
    $this->get('/admin/settings/setup')->assertOk();
});

test('first run never prevents normal users or environment managed panels from using the site', function (bool $environmentOnly) {
    config()->set('aquadactyl.setup.completed', false);
    config()->set('pterodactyl.load_environment_only', $environmentOnly);
    $this->actingAs($environmentOnly ? $this->admin : User::factory()->create())->withHeaders(['Accept' => 'text/html'])->get('/')->assertOk();
    if ($environmentOnly) {
        $this->get('/admin/settings/setup')->assertOk()->assertSee('disabled', false);
        $this->postJson('/admin/settings/setup/branding', $this->branding)->assertStatus(400);
    }
})->with([false, true]);

test('branding saves independently with an optional reencoded logo and relative redirects', function (bool $withLogo) {
    $payload = $this->branding;
    if ($withLogo) {
        $payload['logo'] = UploadedFile::fake()->image('brand.png');
    }
    $this->post('/admin/settings/setup/branding', $payload)->assertRedirect('/admin/settings/setup?step=node')->assertHeader('Location', '/admin/settings/setup?step=node');
    $this->assertDatabaseHas('settings', ['key' => 'settings::app:name', 'value' => 'My Panel']);
    $this->assertDatabaseHas('settings', ['key' => 'settings::aquadactyl:appearance:primary_color', 'value' => '#a85cf4']);
    if ($withLogo) {
        $path = Setting::query()->where('key', SiteLogoService::SETTING)->value('value');
        Storage::disk('public')->assertExists($path);
        expect(getimagesizefromstring(Storage::disk('public')->get($path))[2])->toBe(IMAGETYPE_PNG);
    }
})->with([false, true]);

test('invalid branding cannot change saved settings', function (array $changes) {
    $this->postJson('/admin/settings/setup/branding', array_replace($this->branding, $changes))->assertUnprocessable();
    $this->assertDatabaseMissing('settings', ['key' => 'settings::app:name']);
    expect(Storage::disk('public')->allFiles())->toBe([]);
})->with([
    [['name' => '']], [['primary_color' => 'red;url(x)']],
    [['logo' => UploadedFile::fake()->createWithContent('logo.svg', '<svg/>')]],
]);

test('administrator creation confirms the actor password hashes credentials and ignores privilege inputs', function () {
    $this->post('/admin/settings/setup/admins', $this->account + ['root_admin' => false, 'uuid' => 'attacker', 'external_id' => 'untrusted'])
        ->assertRedirect('/admin/settings/setup?step=admins');
    $user = User::query()->where('username', $this->account['username'])->firstOrFail();
    expect($user->root_admin)->toBeTrue()->and(Hash::check($this->account['password'], $user->password))->toBeTrue()
        ->and($user->external_id)->toBeNull()->and($user->uuid)->not->toBe('attacker');
    Notification::assertSentTo($user, Pterodactyl\Notifications\AccountCreated::class);
    $this->get('/admin/settings/setup?step=admins')->assertSee($user->email)->assertDontSee($this->account['password']);
});

test('administrator creation rejects weak mismatched duplicate or unconfirmed credentials', function (array $changes) {
    $count = User::count();
    $this->postJson('/admin/settings/setup/admins', array_replace($this->account, $changes))->assertUnprocessable();
    expect(User::count())->toBe($count);
})->with([
    [['password' => 'short']], [['password_confirmation' => 'different']],
    [['current_password' => 'wrong']], [['current_password' => '']],
    [['email' => 'invalid']], [['username' => '<script>']],
]);

test('node testing uses saved node credentials and reports only a bounded version', function () {
    $node = Node::factory()->create(['location_id' => Location::factory()->create()->id]);
    $daemon = $this->mock(DaemonConfigurationRepository::class);
    $daemon->shouldReceive('setNode')->once()->with(Mockery::on(fn ($value) => $value->is($node)))->andReturnSelf();
    $daemon->shouldReceive('getSystemInformation')->once()->andReturn(['version' => str_repeat('x', 130), 'secret' => 'never-expose']);
    $this->postJson('/admin/settings/setup/nodes/' . $node->id . '/test')->assertOk()
        ->assertExactJson(['connected' => true, 'message' => __('setup.connected'), 'version' => str_repeat('x', 100)])
        ->assertDontSee('never-expose')->assertDontSee($node->daemon_token_id);
    $this->get('/admin/settings/setup?step=node')->assertOk()->assertSee($node->name)->assertSee('setup-test-node');
});

test('failed or unrecognized daemon replies never expose internal errors', function (bool $connectionError) {
    $node = Node::factory()->create(['location_id' => Location::factory()->create()->id]);
    $daemon = $this->mock(DaemonConfigurationRepository::class);
    $daemon->shouldReceive('setNode')->once()->andReturnSelf();
    if ($connectionError) {
        $daemon->shouldReceive('getSystemInformation')->once()->andThrow(new DaemonConnectionException(new GuzzleHttp\Exception\TransferException('private-token', new GuzzleHttp\Psr7\Request('GET', 'http://daemon.test/api/system'))));
    } else {
        $daemon->shouldReceive('getSystemInformation')->once()->andReturn(['version' => '']);
    }
    $this->postJson('/admin/settings/setup/nodes/' . $node->id . '/test')->assertUnprocessable()->assertDontSee('private-token');
})->with([false, true]);

test('ordinary accounts cannot access any setup operation', function () {
    $node = Node::factory()->create(['location_id' => Location::factory()->create()->id]);
    $this->actingAs(User::factory()->create());
    $this->get('/admin/settings/setup')->assertForbidden();
    foreach (['branding', 'admins', 'complete', 'nodes/' . $node->id . '/test'] as $endpoint) {
        $this->postJson('/admin/settings/setup/' . $endpoint, $this->branding + $this->account)->assertForbidden();
    }
});

test('setup escapes stored administrator names and branding', function () {
    $this->admin->update(['name_first' => '</script><script>confirm(1)</script>']);
    config()->set('app.name', '</script><img src=x onerror=alert(1)>');
    $this->get('/admin/settings/setup?step=admins')->assertOk()->assertDontSee('<script>confirm(1)</script>', false)->assertDontSee('<img src=x onerror=alert(1)>', false);
});

test('setup migration prompts empty installs preserves upgrades and never resets an existing decision', function () {
    $migration = require database_path('migrations/2026_10_20_200000_initialize_panel_setup.php');
    $key = 'settings::aquadactyl:setup:completed';
    $migration->down();
    $migration->up();
    expect(Setting::query()->where('key', $key)->value('value'))->toBe('true');
    $migration->down();
    // Other integration suites leave realistic data behind. Simulate empty
    // existence checks without deleting their fixtures or changing the schema.
    $database = DB::getFacadeRoot();
    $connection = DB::connection();
    try {
        DB::shouldReceive('table')->with('users')->once()->andReturn($connection->table('users')->whereRaw('1 = 0'));
        DB::shouldReceive('table')->with('nodes')->once()->andReturn($connection->table('nodes')->whereRaw('1 = 0'));
        DB::shouldReceive('table')->with('settings')->once()->andReturn($connection->table('settings'));
        $migration->up();
    } finally {
        DB::swap($database);
    }
    expect(Setting::query()->where('key', $key)->value('value'))->toBe('false');
    $migration->up();
    expect(Setting::query()->where('key', $key)->value('value'))->toBe('false');
});

test('failed setup forms never flash administrator passwords to the next page', function () {
    $this->withHeaders(['Accept' => 'text/html'])->from('/admin/settings/setup?step=admins')
        ->post('/admin/settings/setup/admins', array_replace($this->account, ['password_confirmation' => 'mismatch']))
        ->assertRedirect('/admin/settings/setup?step=admins')->assertSessionHasErrors('password')
        ->assertSessionMissing('_old_input.password')->assertSessionMissing('_old_input.password_confirmation')
        ->assertSessionMissing('_old_input.current_password');
});
