<?php

test('owners can choose an egg image and repeated updates avoid duplicate audit events', function () {
    [$user, $server] = $this->generateTestAccount();
    $server->egg->update(['docker_images' => ['Original' => $server->image, 'New' => 'ghcr.io/example/new:latest']]);
    $base = $this->link($server, '/settings/docker-image');
    $this->actingAs($user)->putJson($base, ['docker_image' => 'ghcr.io/example/new:latest'])->assertNoContent();
    expect($server->fresh()->image)->toBe('ghcr.io/example/new:latest');
    $this->putJson($base, ['docker_image' => 'ghcr.io/example/new:latest'])->assertNoContent();
    expect(Pterodactyl\Models\ActivityLog::forEvent('server:startup.image')->forActor($user)->count())->toBe(1);
});

test('an administrators custom image cannot be replaced by a client', function () {
    [$user, $server] = $this->generateTestAccount();
    $server->update(['image' => 'ghcr.io/example/admin-custom:latest']);
    $image = array_values($server->egg->docker_images)[0];
    $this->actingAs($user)->putJson($this->link($server, '/settings/docker-image'), ['docker_image' => $image])->assertBadRequest();
});
