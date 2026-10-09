<?php

use Mockery\MockInterface;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Location;
use Pterodactyl\Repositories\Wings\DaemonConfigurationRepository;

test('admin can update node fqdn when wings is unreachable and flashes alert', function () {
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

    $response->assertRedirect(route('admin.nodes.view.settings', $node->id));
    $followed = $this->get(route('admin.nodes.view.settings', $node->id));
    $followed->assertOk();
    expect($node->refresh()->fqdn)->toBe('new.example.com');
});

test('admin can update node fqdn when wings is reachable', function () {
    $admin = User::factory()->admin()->create();
    $location = Location::factory()->create();
    $node = Node::factory()->for($location)->create([
        'fqdn' => 'old.example.com',
    ]);

    $this->mock(DaemonConfigurationRepository::class, function (MockInterface $mock) use ($node) {
        $mock->expects('setNode')->with(Mockery::on(fn ($value) => $value->is($node)))->andReturnSelf();
        $mock->expects('update')->withAnyArgs()->andReturn(new Response());
    });

    $response = $this->actingAs($admin)
        ->from(route('admin.nodes.view.settings', $node->id))
        ->withHeaders(['Accept' => 'text/html'])
        ->patch(route('admin.nodes.view.settings', $node->id), [
            'name' => 'Updated Node',
            'description' => $node->description,
            'location_id' => $node->location_id,
            'fqdn' => 'reachable.example.com',
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

    $response->assertRedirect(route('admin.nodes.view.settings', $node->id));
    $followed = $this->get(route('admin.nodes.view.settings', $node->id));
    $followed->assertOk();
    expect($node->refresh()->fqdn)->toBe('reachable.example.com')
        ->and($node->name)->toBe('Updated Node');
});
