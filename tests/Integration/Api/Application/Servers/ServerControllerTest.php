<?php

test('skip scripts state is returned', function () {
    $server = $this->createServerModel(['skip_scripts' => true]);

    $this->getJson('/api/application/servers/' . $server->id)
        ->assertOk()
        ->assertJsonPath('attributes.container.skip_scripts', true);

    $server->update(['skip_scripts' => false]);

    $this->getJson('/api/application/servers/' . $server->id)
        ->assertOk()
        ->assertJsonPath('attributes.container.skip_scripts', false);
});
