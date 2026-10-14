<?php

use Lcobucci\JWT\Configuration;
use Pterodactyl\Models\Permission;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use Lcobucci\JWT\Signer\Key\InMemory;

test('file uploads receive a signed short-lived token for the requesting user and server', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_CREATE]);
    $url = $this->actingAs($user)->getJson($this->link($server, '/files/upload'))->assertOk()->assertJsonPath('object', 'signed_url')->json('attributes.url');
    expect($url)->toStartWith($server->node->getConnectionAddress() . '/upload/file?token=');
    parse_str(parse_url($url, PHP_URL_QUERY), $query);
    $jwt = Configuration::forSymmetricSigner(new Sha256(), InMemory::plainText($server->node->getDecryptedKey()));
    $token = $jwt->parser()->parse($query['token']);
    expect($token->claims()->get('server_uuid'))->toBe($server->uuid)
        ->and($token->claims()->get('exp')->getTimestamp() - $token->claims()->get('iat')->getTimestamp())->toBe(900);
});

test('subusers without file creation permission cannot obtain upload tokens', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_READ]);
    $this->actingAs($user)->getJson($this->link($server, '/files/upload'))->assertForbidden();
});

test('the client receives the configured node upload limit in bytes including values over two gibibytes', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_CREATE]);
    $server->node->update(['upload_size' => 4096]);
    $this->actingAs($user)->getJson('/api/client/servers/' . $server->identifier)
        ->assertOk()->assertJsonPath('attributes.upload_limit', 4294967296);
});
