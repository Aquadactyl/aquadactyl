<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Mount;
use Pterodactyl\Models\Location;
use Illuminate\Contracts\Validation\Factory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Helpers\SoftwareVersionService;

uses(DatabaseTransactions::class);

beforeEach(function () {
    config()->set('pterodactyl.auth.2fa_required', 0);
    app('cache')->forever(SoftwareVersionService::VERSION_CACHE_KEY, ['panel' => '1.1-beta.2', 'wings' => '1.1-beta.1']);
});

test('node configuration instructions use the Aquadactyl directory in each language', function (string $language) {
    $admin = User::factory()->create(['root_admin' => true, 'language' => $language]);
    $node = Node::factory()->for(Location::factory())->create();

    $this->actingAs($admin)
        ->get(route('admin.nodes.view.configuration', $node->id))
        ->assertOk()
        ->assertSee('/etc/aquadactyl', false)
        ->assertSee('sudo manta configure', false)
        ->assertDontSee('cd /etc/pterodactyl', false);
})->with(['en', 'fr', 'de']);

test('daemon configuration directories cannot be added as server mount sources', function (string $source, bool $allowed) {
    $validator = app(Factory::class)->make(['source' => $source], ['source' => Mount::getRules()['source']]);

    expect($validator->passes())->toBe($allowed);
})->with([
    'Aquadactyl configuration' => ['/etc/aquadactyl', false],
    'Aquadactyl server data' => ['/var/lib/aquadactyl/volumes', false],
    'legacy configuration' => ['/etc/pterodactyl', false],
    'shared game data' => ['/srv/shared', true],
]);

test('new nodes use Aquadactyl data defaults without rewriting existing nodes', function () {
    expect((new Node())->daemonBase)->toBe('/var/lib/aquadactyl/volumes');
    $node = Node::factory()->for(Location::factory())->create(['daemonBase' => '/srv/existing-servers']);
    $configuration = $node->getConfiguration();
    expect($configuration['config_version'])->toBe(1)
        ->and($configuration['system']['data'])->toBe('/srv/existing-servers');
});
