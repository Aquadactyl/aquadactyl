<?php

use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Event;
use Pterodactyl\Events\Server\Installed;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

beforeEach(function () {
    Event::fake(Installed::class);
    $this->server = $this->createServerModel(['status' => Server::STATUS_INSTALLING, 'installed_at' => null]);
    $node = $this->server->node;
    $this->withHeader('Authorization', 'Bearer ' . $node->daemon_token_id . '.' . $node->getDecryptedKey());
    $this->installUrl = '/api/remote/servers/' . $this->server->uuid . '/install';
});

test('Wings installation scripts are restricted to the assigned node', function (bool $authorized) {
    if (!$authorized) {
        $other = $this->createServerModel();
        $this->withHeader('Authorization', 'Bearer ' . $other->node->daemon_token_id . '.' . $other->node->getDecryptedKey());
        $this->getJson($this->installUrl)->assertForbidden();

        return;
    }
    $egg = $this->server->egg;
    $this->getJson($this->installUrl)->assertOk()->assertExactJson([
        'container_image' => $egg->copy_script_container, 'entrypoint' => $egg->copy_script_entry, 'script' => $egg->copy_script_install,
    ]);
})->with([true, false]);

test('Wings installation reports preserve suspension and classify install and reinstall failures', function (bool $successful, bool $reinstall, bool $suspended, ?string $expected) {
    if ($reinstall) {
        $this->server->forceFill(['installed_at' => now()->subDay()])->save();
    }
    if ($suspended) {
        $this->server->update(['status' => Server::STATUS_SUSPENDED]);
    }
    $this->postJson($this->installUrl, ['successful' => $successful, 'reinstall' => $reinstall])->assertNoContent();
    expect($this->server->refresh()->status)->toBe($expected)->and($this->server->installed_at)->not->toBeNull();
    if ($successful) {
        Event::assertDispatched(Installed::class, fn ($event) => $event->server->id === $this->server->id);
    } else {
        Event::assertNotDispatched(Installed::class);
    }
})->with([
    [true, false, false, null], [true, true, false, null],
    [false, false, false, Server::STATUS_INSTALL_FAILED], [false, true, false, Server::STATUS_REINSTALL_FAILED],
    [true, false, true, Server::STATUS_SUSPENDED], [false, true, true, Server::STATUS_SUSPENDED],
]);

test('install and reinstall notifications honor their independent administrator settings', function (bool $reinstall) {
    if ($reinstall) {
        $this->server->forceFill(['installed_at' => now()->subDay()])->save();
    }
    config()->set('pterodactyl.email.send_' . ($reinstall ? 'reinstall' : 'install') . '_notification', false);
    $this->postJson($this->installUrl, ['successful' => true, 'reinstall' => $reinstall])->assertNoContent();
    Event::assertNotDispatched(Installed::class);
})->with([true, false]);

test('Wings cannot report an installation outcome for another node', function () {
    $other = $this->createServerModel();
    $this->withHeader('Authorization', 'Bearer ' . $other->node->daemon_token_id . '.' . $other->node->getDecryptedKey());
    $this->postJson($this->installUrl, ['successful' => true])->assertForbidden();
    Event::assertNotDispatched(Installed::class);
});

test('Wings installation reports require valid boolean outcomes', function (array $payload) {
    $this->postJson($this->installUrl, $payload)->assertUnprocessable();
    Event::assertNotDispatched(Installed::class);
})->with([[[]], [['successful' => 'invalid']], [['successful' => true, 'reinstall' => 'invalid']]]);
