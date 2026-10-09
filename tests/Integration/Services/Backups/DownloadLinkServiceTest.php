<?php

use Carbon\CarbonImmutable;
use Pterodactyl\Enum\JwtScope;
use Pterodactyl\Models\Backup;
use Lcobucci\JWT\Configuration;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use Lcobucci\JWT\Signer\Key\InMemory;
use Lcobucci\JWT\Validation\Constraint\SignedWith;
use Pterodactyl\Services\Backups\DownloadLinkService;

test('it generates local url with jwt', function () {
    $server = $this->createServerModel();
    $backup = Backup::factory()->for($server)->create([
        'disk' => Backup::ADAPTER_WINGS,
    ]);

    $url = app(DownloadLinkService::class)->handle($backup, $server->user);

    $prefix = $server->node->getConnectionAddress() . '/download/backup?token=';
    expect($url)->toStartWith($prefix);

    $config = Configuration::forSymmetricSigner(new Sha256(), $key = InMemory::plainText($server->node->getDecryptedKey()));
    $config = $config->withValidationConstraints(new SignedWith(new Sha256(), $key));

    /** @var \Lcobucci\JWT\Token\Plain $token */
    $token = $config->parser()->parse(substr($url, strlen($prefix)));

    expect($config->validator()->validate($token, ...$config->validationConstraints()))->toBeTrue();

    $timestamp = CarbonImmutable::createFromTimestamp(CarbonImmutable::now()->getTimestamp())->timezone('UTC');

    // Check that the claims are generated correctly.
    expect($token->hasBeenIssuedBy(config('app.url')))->toBeTrue()
        ->and($token->isPermittedFor($server->node->getConnectionAddress()))->toBeTrue()
        ->and($token->claims()->get('iat'))->toEqual($timestamp)
        ->and($token->claims()->get('nbf'))->toEqual($timestamp->subMinutes(5))
        ->and($token->claims()->get('exp'))->toEqual($timestamp->addMinutes(15))
        ->and($token->claims()->get('backup_uuid'))->toBe($backup->uuid)
        ->and($token->claims()->get('server_uuid'))->toBe($server->uuid)
        ->and($token->claims()->get('scope'))->toBe(JwtScope::BackupDownload->value);
});
