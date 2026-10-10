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

test('admin can update node custom sftp_domain and transformer overrides fqdn', function () {
    $admin = User::factory()->admin()->create();
    $location = Location::factory()->create();
    $node = Node::factory()->for($location)->create([
        'fqdn' => 'node.example.com',
        'sftp_domain' => null,
    ]);

    expect($node->getSftpDomain())->toBe('node.example.com');

    $response = $this->actingAs($admin)
        ->from(route('admin.nodes.view.settings', $node->id))
        ->withHeaders(['Accept' => 'text/html'])
        ->patch(route('admin.nodes.view.settings', $node->id), [
            'name' => $node->name,
            'description' => $node->description,
            'location_id' => $node->location_id,
            'fqdn' => 'node.example.com',
            'sftp_domain' => 'sftp-proxy.example.com',
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
            'daemonSFTP' => 2022,
        ]);

    $response->assertRedirect(route('admin.nodes.view.settings', $node->id));
    expect($node->refresh()->sftp_domain)->toBe('sftp-proxy.example.com')
        ->and($node->getSftpDomain())->toBe('sftp-proxy.example.com');

    $server = $this->createServerModel(['node_id' => $node->id]);
    $request = Illuminate\Http\Request::createFromGlobals();
    $request->setUserResolver(fn () => $admin);
    $transformer = Pterodactyl\Transformers\Api\Client\ServerTransformer::fromRequest($request);
    $transformed = $transformer->transform($server);
    expect($transformed['sftp_details']['ip'])->toBe('sftp-proxy.example.com')
        ->and($transformed['sftp_details']['port'])->toBe(2022);

    // Now clear the custom sftp_domain and verify it falls back to fqdn
    $this->actingAs($admin)
        ->patch(route('admin.nodes.view.settings', $node->id), [
            'name' => $node->name,
            'description' => $node->description,
            'location_id' => $node->location_id,
            'fqdn' => 'node.example.com',
            'sftp_domain' => '',
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
            'daemonSFTP' => 2022,
        ]);

    expect($node->refresh()->sftp_domain)->toBeNull()
        ->and($node->getSftpDomain())->toBe('node.example.com');

    $transformedFallback = $transformer->transform($server->refresh());
    expect($transformedFallback['sftp_details']['ip'])->toBe('node.example.com');
});
