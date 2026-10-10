<?php

use phpseclib4\Crypt\EC;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Permission;
use Pterodactyl\Models\UserSSHKey;

beforeEach(function () {
    [$user, $server] = $this->generateTestAccount();

    $user->update(['password' => password_hash('foobar', PASSWORD_DEFAULT)]);

    $this->user = $user;
    $this->server = $server;

    $this->withHeader('Authorization', 'Bearer ' . $server->node->daemon_token_id . '.' . decrypt($server->node->daemon_token));
});

$getUsername = function ($user, $server, bool $long = false): string {
    return $user->username . '.' . ($long ? $server->uuid : $server->identifier);
};

$makeCertificate = function (): string {
    return <<<'PEM'
-----BEGIN CERTIFICATE-----
MIIClzCCAX+gAwIBAgIBADANBgkqhkiG9w0BAQUFADAPMQ0wCwYDVQQDDAR0ZXN0
MB4XDTI2MDYyODIxMzQzMFoXDTI2MDYyOTIxMzQzMFowDzENMAsGA1UEAwwEdGVz
dDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALZNPzyWTEinfefSMYI8
jPtiDpQ3n4xnqobumxAMDSQd7Wkbi9MyWfV3tr7PIVzblC4aH5iLIy5dOhUWqyBd
LwYbmdGfeghnP261CrYw4npoBO+k1CoAtfjxuv5Mkz9zs4/BtknyqKxteLxLglJI
VTTl/IdGVdacvBSkfystMkK3AjvIwNseWLe2fcwMSs1k0yN/p/6NUYsO4BBkybaM
JF7s3s29nKZDwPn8HxYD/5cnStSI0nhcltYF5O7/6DiH4x5lvT4Z9D+aHppDMTur
yxAkMTSTZqMkE5iOtk6XrnEaXDVOci1fYFYIO0yKExnbf2DkB//W9f1wMYbO40Zc
jMkCAwEAATANBgkqhkiG9w0BAQUFAAOCAQEAAbbdgyP9X3kAgMdMo2yMX6jJC9Kl
NTio30d+NPCXsziA6elS2wWK7LhAVx0WRCho3KNJC2j3sKGOSXwf7HlG8yX4QPng
oMf91+yM95yhJZxVGelKfBGg34Wu1e8l0FcuCchmseR8QtwwuwScDXnYQV7PyRiW
OJ5KEg6opQivmfI4gJWDNbe6ALwHxR0TZeRITQ+tU0r/JCFwbjMX2pFNAl2sjE9x
iiZwIndK2bAsME622kuPgfx/osJ/8zuQhBeRsiLfUT44j2RJNRj99gXRfKAA0vyG
LaKfKLpXnF7mm6UuShG/HRt07bxu6Ayan/SJnv3E5ZkinR5lX0upcmM/gQ==
-----END CERTIFICATE-----
PEM;
};

test('public key is validated correctly', function () use ($getUsername) {
    $key = UserSSHKey::factory()->for($this->user)->create();

    $this->postJson('/api/remote/sftp/auth', [])
        ->assertUnprocessable()
        ->assertJsonPath('errors.0.meta.source_field', 'username')
        ->assertJsonPath('errors.0.meta.rule', 'required')
        ->assertJsonPath('errors.1.meta.source_field', 'password')
        ->assertJsonPath('errors.1.meta.rule', 'required');

    $data = [
        'type' => 'public_key',
        'username' => $getUsername($this->user, $this->server),
        'password' => $key->public_key,
    ];

    $this->postJson('/api/remote/sftp/auth', $data)
        ->assertOk()
        ->assertJsonPath('server', $this->server->uuid)
        ->assertJsonPath('permissions', ['*']);

    $key->delete();
    $this->postJson('/api/remote/sftp/auth', $data)->assertForbidden();
    $this->postJson('/api/remote/sftp/auth', array_merge($data, ['type' => null]))->assertForbidden();
});

test('password is validated correctly', function () use ($getUsername) {
    $this->postJson('/api/remote/sftp/auth', [
        'username' => $getUsername($this->user, $this->server),
        'password' => '',
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.0.meta.source_field', 'password')
        ->assertJsonPath('errors.0.meta.rule', 'required');

    $this->postJson('/api/remote/sftp/auth', [
        'username' => $getUsername($this->user, $this->server),
        'password' => 'wrong password',
    ])
        ->assertForbidden();

    $this->user->update(['password' => password_hash('foobar', PASSWORD_DEFAULT)]);

    $this->postJson('/api/remote/sftp/auth', [
        'username' => $getUsername($this->user, $this->server),
        'password' => 'foobar',
    ])
        ->assertOk();
});

test('user is throttled if invalid credentials are provided', function () use ($getUsername) {
    for ($i = 0; $i <= 10; ++$i) {
        $this->postJson('/api/remote/sftp/auth', [
            'type' => 'public_key',
            'username' => $i % 2 === 0 ? $this->user->username : $getUsername($this->user, $this->server),
            'password' => 'invalid key',
        ])
            ->assertStatus($i === 10 ? 429 : 403);
    }
})->with([
    'password auth' => ['password'],
    'public key auth' => ['public_key'],
]);

test('user is not throttled if no public key matches', function () use ($getUsername) {
    for ($i = 0; $i <= 10; ++$i) {
        $this->postJson('/api/remote/sftp/auth', [
            'type' => 'public_key',
            'username' => $getUsername($this->user, $this->server),
            'password' => EC::createKey('Ed25519')->getPublicKey()->toString('OpenSSH'),
        ])
            ->assertForbidden();
    }
});

test('certificate public key authentication is rejected as invalid key', function () use ($getUsername, $makeCertificate) {
    $certificate = $makeCertificate();

    for ($i = 0; $i <= 5; ++$i) {
        $this->postJson('/api/remote/sftp/auth', [
            'type' => 'public_key',
            'username' => $getUsername($this->user, $this->server),
            'password' => $certificate,
        ])
            ->assertStatus($i === 5 ? 429 : 403);
    }
});

test('request is rejected if server belongs to different node', function (string $type) use ($getUsername) {
    $node2 = $this->createServerModel()->node;

    $this->withHeader('Authorization', 'Bearer ' . $node2->daemon_token_id . '.' . decrypt($node2->daemon_token));

    $password = $type === 'public_key'
        ? UserSSHKey::factory()->for($this->user)->create()->public_key
        : 'foobar';

    $this->postJson('/api/remote/sftp/auth', [
        'type' => 'public_key',
        'username' => $getUsername($this->user, $this->server),
        'password' => $password,
    ])
        ->assertForbidden();
})->with([
    'password auth' => ['password'],
    'public key auth' => ['public_key'],
]);

test('request is denied if user lacks sftp permission', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_READ]);

    $user->update(['password' => password_hash('foobar', PASSWORD_DEFAULT)]);

    $this->withHeader('Authorization', 'Bearer ' . $server->node->daemon_token_id . '.' . decrypt($server->node->daemon_token));

    $this->postJson('/api/remote/sftp/auth', [
        'username' => $user->username . '.' . $server->identifier,
        'password' => 'foobar',
    ])
        ->assertForbidden()
        ->assertJsonPath('errors.0.detail', 'You do not have permission to access SFTP for this server.');
});

test('invalid server state returns conflict error', function (string $status) use ($getUsername) {
    $this->server->update(['status' => $status]);

    $this->postJson('/api/remote/sftp/auth', ['username' => $getUsername($this->user, $this->server), 'password' => 'foobar'])
        ->assertStatus(409);
})->with([
    'installing' => [Server::STATUS_INSTALLING],
    'suspended' => [Server::STATUS_SUSPENDED],
    'restoring a backup' => [Server::STATUS_RESTORING_BACKUP],
]);

test('user permissions are returned correctly', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_READ, Permission::ACTION_FILE_SFTP]);

    $user->update(['password' => password_hash('foobar', PASSWORD_DEFAULT)]);

    $this->withHeader('Authorization', 'Bearer ' . $server->node->daemon_token_id . '.' . decrypt($server->node->daemon_token));

    $data = [
        'username' => $user->username . '.' . $server->identifier,
        'password' => 'foobar',
    ];

    $this->postJson('/api/remote/sftp/auth', $data)
        ->assertOk()
        ->assertJsonPath('permissions', [Permission::ACTION_FILE_READ, Permission::ACTION_FILE_SFTP]);

    $user->update(['root_admin' => true]);

    $this->postJson('/api/remote/sftp/auth', $data)
        ->assertOk()
        ->assertJsonPath('permissions.0', '*');

    $this->withHeader('Authorization', 'Bearer ' . $this->server->node->daemon_token_id . '.' . decrypt($this->server->node->daemon_token));
    $data['username'] = $user->username . '.' . $this->server->identifier;

    $this->post('/api/remote/sftp/auth', $data)
        ->assertOk()
        ->assertJsonPath('permissions.0', '*');

    $user->update(['root_admin' => false]);
    $this->post('/api/remote/sftp/auth', $data)->assertForbidden();
});
