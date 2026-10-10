<?php

use phpseclib4\Crypt\EC;
use Pterodactyl\Models\User;
use Pterodactyl\Models\UserSSHKey;

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

test('ssh keys are returned', function () {
    $user = User::factory()->create();
    $user2 = User::factory()->create();

    $key = UserSSHKey::factory()->for($user)->create();
    UserSSHKey::factory()->for($user2)->rsa()->create();

    $this->actingAs($user);
    $response = $this->getJson('/api/client/account/ssh-keys')
        ->assertOk()
        ->assertJsonPath('object', 'list')
        ->assertJsonPath('data.0.object', UserSSHKey::RESOURCE_NAME);

    $this->assertJsonTransformedWith($response->json('data.0.attributes'), $key);
});

test('ssh key can be deleted', function () {
    $user = User::factory()->create();
    $user2 = User::factory()->create();

    $key = UserSSHKey::factory()->for($user)->create();
    $key2 = UserSSHKey::factory()->for($user2)->create();

    $endpoint = '/api/client/account/ssh-keys/remove';

    $this->actingAs($user);
    $this->postJson($endpoint)
        ->assertUnprocessable()
        ->assertJsonPath('errors.0.meta', ['source_field' => 'fingerprint', 'rule' => 'required']);

    $this->postJson($endpoint, ['fingerprint' => $key->fingerprint])->assertNoContent();

    $this->assertSoftDeleted($key);
    $this->assertNotSoftDeleted($key2);

    $this->postJson($endpoint, ['fingerprint' => $key->fingerprint])->assertNoContent();
    $this->postJson($endpoint, ['fingerprint' => $key2->fingerprint])->assertNoContent();

    $this->assertNotSoftDeleted($key2);
});

test('dsa key is rejected', function () {
    $user = User::factory()->create();
    $key = UserSSHKey::factory()->dsa()->make();

    $this->actingAs($user)->postJson('/api/client/account/ssh-keys', [
        'name' => 'Name',
        'public_key' => $key->public_key,
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.0.detail', 'DSA keys are not supported.');

    expect($user->sshKeys()->count())->toBe(0);
});

test('weak rsa key is rejected', function () {
    $user = User::factory()->create();
    $key = UserSSHKey::factory()->rsa(true)->make();

    $this->actingAs($user)->postJson('/api/client/account/ssh-keys', [
        'name' => 'Name',
        'public_key' => $key->public_key,
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.0.detail', 'RSA keys must be at least 2048 bytes in length.');

    expect($user->sshKeys()->count())->toBe(0);
});

test('invalid or private key is rejected', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/client/account/ssh-keys', [
        'name' => 'Name',
        'public_key' => 'invalid',
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.0.detail', 'The public key provided is not valid.');

    expect($user->sshKeys()->count())->toBe(0);

    $key = EC::createKey('Ed25519');
    $this->actingAs($user)->postJson('/api/client/account/ssh-keys', [
        'name' => 'Name',
        'public_key' => $key->toString('PKCS8'),
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.0.detail', 'The public key provided is not valid.');

    expect($user->sshKeys()->count())->toBe(0);
});

test('certificate cannot be stored as ssh key', function () use ($makeCertificate) {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/client/account/ssh-keys', [
        'name' => 'Name',
        'public_key' => $makeCertificate(),
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.0.detail', 'The public key provided is not valid.');

    expect($user->sshKeys()->count())->toBe(0);
});

test('public key can be stored', function () {
    $user = User::factory()->create();
    $key = UserSSHKey::factory()->make();

    $this->actingAs($user)->postJson('/api/client/account/ssh-keys', [
        'name' => 'Name',
        'public_key' => $key->public_key,
    ])
        ->assertOk()
        ->assertJsonPath('object', UserSSHKey::RESOURCE_NAME)
        ->assertJsonPath('attributes.public_key', $key->public_key);

    expect($user->sshKeys)->toHaveCount(1)
        ->and($user->sshKeys[0]->public_key)->toBe($key->public_key);
});

test('public key that already exists cannot be added a second time', function () {
    $user = User::factory()->create();
    $key = UserSSHKey::factory()->for($user)->create();

    $this->actingAs($user)->postJson('/api/client/account/ssh-keys', [
        'name' => 'Name',
        'public_key' => $key->public_key,
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.0.detail', 'The public key provided already exists on your account.');

    expect($user->sshKeys()->count())->toBe(1);
});
