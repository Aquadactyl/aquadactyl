<?php

use Illuminate\Http\Request;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\Location;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Http\Controllers\Api\Remote\EggInstallController;

uses(DatabaseTransactions::class);

test('Wings receives its own installation script with normalized line endings and environment', function (bool $hasScript) {
    $server = $this->createServerModel();
    $server->egg->update(['script_install' => $hasScript ? "first\r\nsecond\rthird\n" : null, 'script_container' => 'alpine:latest', 'script_entry' => 'sh', 'script_is_privileged' => false]);
    $this->withHeader('Authorization', 'Bearer ' . $server->node->daemon_token_id . '.' . $server->node->getDecryptedKey());
    $this->getJson('/api/remote/servers/' . $server->uuid . '/install')->assertOk()
        ->assertJsonPath('script', $hasScript ? "first\r\nsecond\rthird\n" : null)->assertJsonPath('container_image', 'alpine:latest');
    $request = Request::create('/legacy-install');
    $request->attributes->set('node', $server->node);
    $response = app(EggInstallController::class)->index($request, $server->uuid);
    $data = $response->getData(true);
    expect($data['scripts']['install'])->toBe($hasScript ? "first\nsecond\nthird\n" : null)
        ->and($data['scripts']['privileged'])->toBeFalse()->and($data['config'])->toBe(['container' => 'alpine:latest', 'entry' => 'sh'])
        ->and($data['env']['P_SERVER_UUID'])->toBe($server->uuid);
})->with([true, false]);

test('Wings cannot request an installation script for another node', function () {
    $server = $this->createServerModel();
    $node = Node::factory()->for(Location::factory())->create();
    $this->withHeader('Authorization', 'Bearer ' . $node->daemon_token_id . '.' . $node->getDecryptedKey());
    $this->getJson('/api/remote/servers/' . $server->uuid . '/install')->assertForbidden();
});
