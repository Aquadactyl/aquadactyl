<?php

use Pterodactyl\Models\User;

test('an account with no servers receives an empty list', function () {
    $this->actingAs(User::factory()->create())->getJson('/api/client')->assertOk()->assertJsonCount(0, 'data');
});
