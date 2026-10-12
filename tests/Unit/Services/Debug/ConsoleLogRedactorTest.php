<?php

use Pterodactyl\Models\Node;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\EggVariable;
use Pterodactyl\Services\Debug\DebugPasteService;
use Pterodactyl\Services\Debug\ConsoleLogRedactor;

test('console redaction handles personal data, unlabelled secrets and wrapped key material', function () {
    $server = (new Server())->forceFill(['uuid' => '12345678-1234-1234-1234-123456789abc']);
    $server->setRelation('node', (new Node())->forceFill(['fqdn' => 'private.node.example', 'daemon_token' => 'node-private-key']));
    $server->setRelation('allocations', collect());
    $server->setRelation('variables', collect([
        (new EggVariable())->forceFill(['env_variable' => 'RCON_PASSWORD', 'user_viewable' => true, 'default_value' => 'unlabelled-secret']),
        (new EggVariable())->forceFill(['env_variable' => 'LICENSE', 'user_viewable' => false, 'default_value' => 'private-license']),
        (new EggVariable())->forceFill(['env_variable' => 'SERVER_JAR', 'user_viewable' => true, 'default_value' => 'server.jar']),
    ]));
    $logs = "[11:34:59] Server ready server.jar\nContact player@example.test\n203.0.113.42 [2001:db8::1] ::1\n{$server->uuid}\nprivate.node.example node-private-key\nunlabelled-secret private-license\n--password command-secret\n/login player-password\n/register password repeated-password\nhttps://example.test/?token=url-secret\n" . str_repeat('A', 64);
    $result = (new ConsoleLogRedactor(new DebugPasteService()))->redact($logs, $server);
    expect($result)->toContain('[11:34:59] Server ready server.jar', '[REDACTED]')
        ->not->toContain('player@example.test', '203.0.113.42', '2001:db8::1', '::1', $server->uuid, 'private.node.example', 'node-private-key', 'unlabelled-secret', 'private-license', 'command-secret', 'player-password', 'repeated-password', 'url-secret', str_repeat('A', 64));
});
