<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Location;

test('admin can update node fqdn when wings is unreachable', function () {
    $admin = User::factory()->admin()->create();
    $location = Location::factory()->create();
    $node = Node::factory()->for($location)->create([
        'fqdn' => 'old.example.com',
    ]);

    $response = $this->actingAs($admin)
        ->from(route('admin.nodes.view.settings', $node->id))
        ->withHeaders(['Accept' => 'text/html'])
        ->patch(route('admin.nodes.view.settings', $node->id), [
            'name' => $node->name,
            'description' => $node->description,
            'location_id' => $node->location_id,
            'fqdn' => 'new.example.com',
            'scheme' => 'https',
            'public' => '1',
            'behind_proxy' => '0',
            'maintenance_mode' => '0',
            'memory' => $node->memory,
            'memory_overallocate' => $node->memory_overallocate,
            'disk' => $node->disk,
            'disk_overallocate' => $node->disk_overallocate,
            'upload_size' => $node->upload_size,
            'daemonListen' => $node->daemonListen,
            'daemonSFTP' => $node->daemonSFTP,
        ]);

    dump($response->getStatusCode());
    dump($response->getContent());
    if ($response->getStatusCode() === 500) {
        dump($response->exception ? get_class($response->exception) . ': ' . $response->exception->getMessage() : '500 without exception');
        dump($response->exception ? $response->exception->getTraceAsString() : '');
    }

    $response->assertRedirect(route('admin.nodes.view.settings', $node->id));
    $followed = $this->get(route('admin.nodes.view.settings', $node->id));
    dump('followed status: ' . $followed->getStatusCode());
    if ($followed->getStatusCode() === 500) {
        dump($followed->exception ? get_class($followed->exception) . ': ' . $followed->exception->getMessage() : '500 without exception');
    }
    expect($node->refresh()->fqdn)->toBe('new.example.com');
});
