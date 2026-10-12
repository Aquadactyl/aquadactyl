<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Location;
use Pterodactyl\Services\Eggs\EggDownloadService;
use Pterodactyl\Services\Helpers\SoftwareVersionService;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

test('admin pages render in the saved account language', function (string $locale, string $path, array $headings) {
    $admin = User::factory()->create(['root_admin' => true, 'language' => $locale]);
    $location = Location::factory()->create();
    Node::factory()->create(['location_id' => $location->id]);
    config()->set('mail.default', 'smtp');
    $this->mock(EggDownloadService::class, function ($mock) {
        $mock->shouldReceive('catalog')->andReturn([]);
    });

    $this->actingAs($admin)->withHeader('Accept-Language', 'en')->get($path)
        ->assertOk()
        ->assertSee('lang="' . $locale . '"', false)
        ->assertSee($headings[$locale])
        ->assertDontSee('admin/ui.');
})->with(['en', 'fr', 'de'])->with([
    'overview' => ['/admin', ['en' => 'Administrative Overview', 'fr' => "Vue d'ensemble de l'administration", 'de' => 'Administrationsübersicht']],
    'general settings' => ['/admin/settings', ['en' => 'Site Settings', 'fr' => 'Réglages du site', 'de' => 'Website-Einstellungen']],
    'advanced settings' => ['/admin/settings/advanced', ['en' => 'Advanced Settings', 'fr' => 'Réglages avancés', 'de' => 'Erweiterte Einstellungen']],
    'mail settings' => ['/admin/settings/mail', ['en' => 'Mail Settings', 'fr' => 'Réglages e-mail', 'de' => 'E-Mail-Einstellungen']],
    'OAuth settings' => ['/admin/settings/oauth', ['en' => 'OAuth Settings', 'fr' => 'Réglages OAuth', 'de' => 'OAuth-Einstellungen']],
    'users' => ['/admin/users', ['en' => 'User List', 'fr' => 'Liste des utilisateurs', 'de' => 'Benutzerliste']],
    'new user' => ['/admin/users/new', ['en' => 'Create User', 'fr' => 'Créer un utilisateur', 'de' => 'Benutzer erstellen']],
    'servers' => ['/admin/servers', ['en' => 'Server List', 'fr' => 'Liste des serveurs', 'de' => 'Serverliste']],
    'new server' => ['/admin/servers/new', ['en' => 'Create Server', 'fr' => 'Créer un serveur', 'de' => 'Server erstellen']],
    'nodes' => ['/admin/nodes', ['en' => 'Node List', 'fr' => 'Liste des nœuds', 'de' => 'Nodeliste']],
    'new node' => ['/admin/nodes/new', ['en' => 'Create Node', 'fr' => 'Créer le nœud', 'de' => 'Node erstellen']],
    'locations' => ['/admin/locations', ['en' => 'Location List', 'fr' => 'Liste des emplacements', 'de' => 'Standortliste']],
    'databases' => ['/admin/databases', ['en' => 'Host List', 'fr' => 'Liste des hôtes', 'de' => 'Hostliste']],
    'mounts' => ['/admin/mounts', ['en' => 'Mount List', 'fr' => 'Liste des montages', 'de' => 'Mountliste']],
    'nests' => ['/admin/nests', ['en' => 'Configured Nests', 'fr' => 'Nests configurés', 'de' => 'Konfigurierte Nests']],
    'egg library' => ['/admin/egg-library', ['en' => 'Find an egg', 'fr' => 'Trouver un egg', 'de' => 'Egg suchen']],
    'application API' => ['/admin/api/new', ['en' => 'New Credentials', 'fr' => 'Nouveaux identifiants', 'de' => 'Neue Zugangsdaten']],
]);

test('automatic admin language follows browser preferences on each request', function () {
    $admin = User::factory()->create(['root_admin' => true, 'language' => 'auto']);
    $settings = app(SettingsRepositoryInterface::class);
    $settings->set('settings::app:locale', 'en');

    $this->actingAs($admin)->withHeader('Accept-Language', 'fr-CA,fr;q=0.9,en;q=0.8')->get('/admin/settings')
        ->assertOk()->assertSee('lang="fr"', false)->assertSee('Langue par défaut');
    $this->withHeader('Accept-Language', 'de-AT,de;q=0.9,en;q=0.8')->get('/admin/settings')
        ->assertOk()->assertSee('lang="de"', false)->assertSee('Standardsprache');

    expect($settings->get('settings::app:locale'))->toBe('en')
        ->and($admin->fresh()->language)->toBe('auto');
});

test('localized settings keep user supplied values escaped and validation labels readable', function () {
    $admin = User::factory()->create(['root_admin' => true, 'language' => 'fr']);
    $unsafe = '<script>window.untrusted = true;</script>';
    $this->actingAs($admin)->withSession(['_old_input' => ['app:name' => $unsafe]])->get('/admin/settings/appearance')
        ->assertOk()
        ->assertSee($unsafe)
        ->assertDontSee($unsafe, false);
    $this->get('/admin/settings')->assertOk()
        ->assertSee('Nombre de joueurs')
        ->assertSee('Photos de profil personnalisées');

    $this->postJson('/admin/settings', [
        'app:name' => '', 'pterodactyl:auth:2fa_required' => '0', 'app:locale' => 'en',
        '_method' => 'PATCH',
    ])->assertUnprocessable()->assertJsonPath('errors.0.detail', 'Le champ Nom du site est obligatoire.');
});

test('a language choice does not grant access to administration', function () {
    $user = User::factory()->create(['root_admin' => false, 'language' => 'de']);
    $this->actingAs($user)->get('/admin/settings')->assertForbidden();
});

test('the default language field keeps the site choice separate from the admin preference', function () {
    config()->set('app.locale', 'de');
    $admin = User::factory()->create(['root_admin' => true, 'language' => 'fr']);

    $response = $this->actingAs($admin)->get('/admin/settings')->assertOk()->assertSee('Langue par défaut');
    preg_match('/<select name="app:locale"[^>]*>(.*?)<\/select>/s', $response->getContent(), $matches);
    $this->assertMatchesRegularExpression('/<option value="de"[^>]* selected[^>]*>/', $matches[1]);
    $this->assertDoesNotMatchRegularExpression('/<option value="fr"[^>]* selected[^>]*>/', $matches[1]);
});

test('translated management detail pages render for existing models', function (string $locale) {
    $admin = User::factory()->create(['root_admin' => true, 'language' => $locale]);
    $server = $this->createServerModel(['status' => null]);
    app('cache')->forever(SoftwareVersionService::VERSION_CACHE_KEY, ['panel' => '1.0.0', 'wings' => '1.0.0']);
    $this->actingAs($admin);

    $paths = [
        '/admin/users/view/' . $admin->id,
        '/admin/nests/view/' . $server->nest_id,
        '/admin/nests/egg/' . $server->egg_id,
        '/admin/nests/egg/' . $server->egg_id . '/variables',
        '/admin/nests/egg/' . $server->egg_id . '/scripts',
    ];
    foreach (['', '/details', '/build', '/startup', '/database', '/mounts', '/manage', '/delete'] as $suffix) {
        $paths[] = '/admin/servers/view/' . $server->id . $suffix;
    }
    foreach (['', '/settings', '/configuration', '/allocation', '/servers'] as $suffix) {
        $paths[] = '/admin/nodes/view/' . $server->node_id . $suffix;
    }
    foreach ($paths as $path) {
        $this->get($path)->assertOk()->assertSee('lang="' . $locale . '"', false)->assertDontSee('admin/ui.');
    }
})->with(['fr', 'de']);
