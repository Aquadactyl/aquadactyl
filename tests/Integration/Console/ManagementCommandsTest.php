<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Location;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Repositories\Wings\DaemonPowerRepository;

uses(DatabaseTransactions::class);

beforeEach(function () { Notification::fake(); });

test('node listing supports text and JSON and exposes no daemon credentials', function (string $format) {
    $node = Node::factory()->create(['location_id' => Location::factory()->create()->id]);
    $this->artisan('p:node:list', ['--format' => $format])->expectsOutputToContain($node->name)->doesntExpectOutputToContain($node->daemon_token)->assertExitCode(0);
})->with(['text', 'json']);

test('node configuration accepts IDs and UUIDs and renders supported formats', function (string $identifier, string $format) {
    $node = Node::factory()->create(['location_id' => Location::factory()->create()->id]);
    $this->artisan('p:node:configuration', ['node' => $node->{$identifier}, '--format' => $format])->expectsOutputToContain($node->uuid)->assertExitCode(0);
})->with([['id', 'json'], ['uuid', 'yaml'], ['id', 'yml']]);

test('node configuration rejects an unsupported output format', function () {
    $node = Node::factory()->create(['location_id' => Location::factory()->create()->id]);
    $this->artisan('p:node:configuration', ['node' => $node->id, '--format' => 'xml'])->expectsOutput('Invalid format specified. Valid options are "yaml" and "json".')->assertExitCode(1);
});

test('node configuration reports a missing node with a failure status', function () {
    $this->artisan('p:node:configuration', ['node' => 'missing-node'])->expectsOutput('The selected node does not exist.')->assertExitCode(1);
});

test('the node creation command persists the submitted resource limits and optional SFTP domain', function () {
    $location = Location::factory()->create();
    $this->artisan('p:node:make', [
        '--name' => 'Command node', '--description' => 'Created through the CLI', '--locationId' => $location->id,
        '--fqdn' => '127.0.0.1', '--scheme' => 'http', '--public' => '1', '--proxy' => '0', '--maintenance' => '0',
        '--maxMemory' => '4096', '--overallocateMemory' => '0', '--maxDisk' => '8192', '--overallocateDisk' => '0',
        '--uploadSize' => '100', '--daemonListeningPort' => '8080', '--daemonSFTPPort' => '2022',
        '--daemonBase' => '/srv/daemon-data', '--sftpDomain' => 'sftp.example.test',
    ])->assertExitCode(0);
    $node = Node::query()->where('name', 'Command node')->firstOrFail();
    expect($node->memory)->toBe(4096)->and($node->disk)->toBe(8192)->and($node->getSftpDomain())->toBe('sftp.example.test');
});

test('noninteractive node creation defaults browser uploads to two gibibytes', function () {
    $this->withoutMockingConsoleOutput();
    $location = Location::factory()->create();
    $exitCode = $this->artisan('p:node:make', [
        '--name' => 'Large upload CLI node', '--description' => 'Default upload limit', '--locationId' => $location->id,
        '--fqdn' => '127.0.0.1', '--scheme' => 'http', '--public' => '1', '--proxy' => '0', '--maintenance' => '0',
        '--maxMemory' => '4096', '--overallocateMemory' => '0', '--maxDisk' => '8192', '--overallocateDisk' => '0',
        '--daemonListeningPort' => '8080', '--daemonSFTPPort' => '2022', '--daemonBase' => '/srv/daemon-data',
        '--sftpDomain' => 'sftp.example.test', '--no-interaction' => true,
    ]);
    expect($exitCode)->toBe(0);
    expect(Node::query()->where('name', 'Large upload CLI node')->firstOrFail()->upload_size)->toBe(2048);
});

test('user creation command hashes passwords and assigns the requested administrator role', function (bool $admin) {
    $this->artisan('p:user:make', ['--email' => 'cli@example.test', '--username' => 'cliuser', '--name-first' => 'CLI', '--name-last' => 'User', '--password' => 'TestingPassword123!', '--admin' => $admin ? '1' : '0'])->assertExitCode(0);
    $user = User::query()->where('email', 'cli@example.test')->firstOrFail();
    expect($user->root_admin)->toBe($admin)->and(Hash::check('TestingPassword123!', $user->password))->toBeTrue();
})->with([true, false]);

test('interactive user creation supports password entry and optional administrator confirmation', function () {
    $this->artisan('p:user:make')
        ->expectsConfirmation(trans('command/messages.user.ask_admin'), false)
        ->expectsQuestion(trans('command/messages.user.ask_email'), 'interactive@example.test')
        ->expectsQuestion(trans('command/messages.user.ask_username'), 'interactive')
        ->expectsQuestion(trans('command/messages.user.ask_name_first'), 'Interactive')
        ->expectsQuestion(trans('command/messages.user.ask_name_last'), 'User')
        ->expectsQuestion(trans('command/messages.user.ask_password'), 'TestingPassword123!')
        ->assertExitCode(0);
    expect(User::query()->where('email', 'interactive@example.test')->firstOrFail()->root_admin)->toBeFalse();
});

test('the user deletion command removes one matching unused account without interaction', function () {
    $this->withoutMockingConsoleOutput();
    $user = User::factory()->create(['username' => 'command-delete']);
    expect($this->artisan('p:user:delete', ['--user' => $user->email, '--no-interaction' => true]))->toBe(0);
    $this->assertDatabaseMissing('users', ['id' => $user->id]);
});

test('the user deletion command refuses missing and ambiguous search results', function (bool $ambiguous) {
    if ($ambiguous) {
        User::factory()->create(['username' => 'ambiguous-one']);
        User::factory()->create(['username' => 'ambiguous-two']);
    }
    $this->artisan('p:user:delete', ['--user' => $ambiguous ? 'ambiguous-' : 'missing-coverage-user', '--no-interaction' => true])->assertExitCode(1);
    if ($ambiguous) {
        expect(User::query()->where('username', 'like', 'ambiguous-%')->count())->toBe(2);
    }
})->with([true, false]);

test('bulk power selection excludes suspended and installing servers for every filter combination', function (string $selection) {
    $this->withoutMockingConsoleOutput();
    Server::query()->update(['status' => Server::STATUS_SUSPENDED]);
    $selected = $this->createServerModel();
    $this->createServerModel(['node_id' => $selected->node_id, 'status' => Server::STATUS_SUSPENDED]);
    $this->createServerModel(['node_id' => $selected->node_id, 'status' => Server::STATUS_INSTALLING]);
    $daemon = $this->mock(DaemonPowerRepository::class);
    $daemon->shouldReceive('setServer')->once()->with(Mockery::on(fn ($server) => $server->id === $selected->id))->andReturnSelf();
    $daemon->shouldReceive('send')->once()->with('start');
    $options = ['action' => 'start', '--no-interaction' => true];
    if (in_array($selection, ['nodes', 'both'])) {
        $options['--nodes'] = (string) $selected->node_id;
    }
    if (in_array($selection, ['servers', 'both'])) {
        $options['--servers'] = (string) $selected->id;
    }
    expect($this->artisan('p:server:bulk-power', $options))->toBe(0);
})->with(['all', 'nodes', 'servers', 'both']);

test('bulk power commands validate actions and numeric selections before calling Wings', function (array $options) {
    $this->withoutMockingConsoleOutput();
    $this->mock(DaemonPowerRepository::class)->shouldNotReceive('setServer');
    expect(fn () => $this->artisan('p:server:bulk-power', $options))->toThrow(ValidationException::class);
})->with([[['action' => 'invalid']], [['action' => 'start', '--nodes' => '0']], [['action' => 'stop', '--servers' => 'invalid']]]);

test('declining a bulk power operation leaves every server untouched', function () {
    $server = $this->createServerModel();
    $this->mock(DaemonPowerRepository::class)->shouldNotReceive('setServer');
    $this->artisan('p:server:bulk-power', ['action' => 'stop', '--servers' => (string) $server->id])
        ->expectsConfirmation(trans('command/messages.server.power.confirm', ['action' => 'stop', 'count' => 1]), false)->assertExitCode(0);
});

test('a Wings connection failure does not prevent the remaining bulk power actions', function () {
    $this->withoutMockingConsoleOutput();
    $first = $this->createServerModel();
    $second = $this->createServerModel();
    $daemon = $this->mock(DaemonPowerRepository::class);
    $daemon->shouldReceive('setServer')->twice()->andReturnSelf();
    $daemon->shouldReceive('send')->once()->ordered()->andThrow(new Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException(new GuzzleHttp\Exception\ConnectException('Offline', new GuzzleHttp\Psr7\Request('POST', '/power'))));
    $daemon->shouldReceive('send')->once()->ordered();
    expect($this->artisan('p:server:bulk-power', ['action' => 'restart', '--servers' => $first->id . ',' . $second->id, '--no-interaction' => true]))->toBe(0);
});

test('interactive user deletion retries missing searches and empty selections without deleting the wrong user', function () {
    $user = User::factory()->create(['username' => 'interactive-deletion']);
    $this->artisan('p:user:delete')
        ->expectsQuestion(trans('command/messages.user.search_users'), 'missing-interactive-delete')
        ->expectsQuestion(trans('command/messages.user.search_users'), 'interactive-deletion')
        ->expectsQuestion(trans('command/messages.user.select_search_user'), '')
        ->expectsQuestion(trans('command/messages.user.search_users'), 'interactive-deletion')
        ->expectsQuestion(trans('command/messages.user.select_search_user'), (string) $user->id)
        ->expectsConfirmation(trans('command/messages.user.confirm_delete'), false)->assertExitCode(0);
    $this->assertDatabaseHas('users', ['id' => $user->id]);
});
