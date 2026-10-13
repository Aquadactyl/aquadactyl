<?php

use Pterodactyl\Models\Allocation;
use Illuminate\Database\ConnectionInterface;
use Pterodactyl\Exceptions\DisplayException;
use Pterodactyl\Tests\Fixtures\RuntimeFaults;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Pterodactyl\Services\Allocations\AssignmentService;
use Pterodactyl\Exceptions\Service\Allocation\CidrOutOfRangeException;
use Pterodactyl\Exceptions\Service\Allocation\PortOutOfRangeException;
use Pterodactyl\Exceptions\Service\Allocation\InvalidPortMappingException;
use Pterodactyl\Exceptions\Service\Allocation\TooManyPortsInRangeException;

require_once __DIR__ . '/../../../Fixtures/RuntimeFaults.php';

uses(DatabaseTransactions::class);
afterEach(function () { RuntimeFaults::$enabled = []; });

test('allocation batches roll back every inserted port when a later port is invalid', function (string $port, string $error) {
    $server = $this->createServerModel();
    $connection = app(ConnectionInterface::class);
    $depth = $connection->transactionLevel();
    expect(fn () => app(AssignmentService::class)->handle($server->node, [
        'allocation_ip' => '192.0.2.50', 'allocation_ports' => ['30000', $port],
    ]))->toThrow($error);
    expect($connection->transactionLevel())->toBe($depth);
    $this->assertDatabaseMissing('allocations', ['node_id' => $server->node_id, 'ip' => '192.0.2.50']);
})->with([
    ['invalid', InvalidPortMappingException::class], ['1024', PortOutOfRangeException::class],
    ['65536', PortOutOfRangeException::class], ['1000-1001', PortOutOfRangeException::class],
    ['65534-65536', PortOutOfRangeException::class], ['2000-3000', TooManyPortsInRangeException::class],
]);

test('allocation CIDR prefixes outside supported bounds are rejected before writing', function (string $prefix) {
    $server = $this->createServerModel();
    expect(fn () => app(AssignmentService::class)->handle($server->node, ['allocation_ip' => '192.0.2.50/' . $prefix, 'allocation_ports' => ['30000']]))->toThrow(CidrOutOfRangeException::class);
})->with(['24', '33', 'invalid']);

test('allocation hostnames resolve through IPv4 or IPv6 and CIDR assignments retain aliases', function (string $address, array $expected) {
    $server = $this->createServerModel();
    RuntimeFaults::$enabled['allocations.ipv4'] = ['v4.example.test' => '192.0.2.50', 'v6.example.test' => 'v6.example.test'];
    RuntimeFaults::$enabled['allocations.ipv6'] = ['v6.example.test' => [['ipv6' => '2001:db8::1']]];
    app(AssignmentService::class)->handle($server->node, ['allocation_ip' => $address, 'allocation_ports' => ['30000-30001'], 'allocation_alias' => 'Example']);
    $rows = Allocation::where('node_id', $server->node_id)->where('ip_alias', 'Example')->get();
    expect($rows->pluck('ip')->unique()->values()->all())->toBe($expected)
        ->and($rows->count())->toBe(count($expected) * 2);
})->with([
    ['v4.example.test', ['192.0.2.50']], ['v6.example.test', ['2001:db8::1']],
    ['v4.example.test/31', ['192.0.2.50', '192.0.2.51']],
]);

test('unresolvable allocation hostnames report a controlled error without inserting rows', function () {
    $server = $this->createServerModel();
    RuntimeFaults::$enabled['allocations.ipv4'] = ['missing.example.test' => 'missing.example.test'];
    RuntimeFaults::$enabled['allocations.ipv6'] = ['missing.example.test' => false];
    expect(fn () => app(AssignmentService::class)->handle($server->node, ['allocation_ip' => 'missing.example.test', 'allocation_ports' => ['30000']]))->toThrow(DisplayException::class, 'Could not parse');
});
