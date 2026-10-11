<?php

namespace Pterodactyl\Tests\Fixtures;

use Pterodactyl\Models\User;
use Pterodactyl\Services\Accounts\PasskeyService;

/** A software authenticator that signs real ES256 WebAuthn ceremonies. */
class PasskeyAuthenticator
{
    private \OpenSSLAsymmetricKey $key;

    private string $id;

    public function __construct()
    {
        $this->key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1']);
        $this->id = random_bytes(32);
    }

    private function header(int $major, int $length): string
    {
        return $length < 24 ? chr(($major << 5) | $length)
            : ($length < 256 ? chr(($major << 5) | 24) . chr($length) : chr(($major << 5) | 25) . pack('n', $length));
    }

    private function number(int $number): string
    {
        return $number >= 0 ? $this->header(0, $number) : $this->header(1, -1 - $number);
    }

    private function text(string $text): string
    {
        return $this->header(3, strlen($text)) . $text;
    }

    private function bytes(string $bytes): string
    {
        return $this->header(2, strlen($bytes)) . $bytes;
    }

    private function clientData(string $challenge, string $origin, string $type): string
    {
        return json_encode(['type' => $type, 'challenge' => $challenge, 'origin' => $origin, 'crossOrigin' => false], JSON_THROW_ON_ERROR);
    }

    public function registration(string $challenge, string $origin = 'http://localhost:8083', bool $verified = true): array
    {
        $ec = openssl_pkey_get_details($this->key)['ec'];
        $cose = $this->header(5, 5) . $this->number(1) . $this->number(2) . $this->number(3) . $this->number(-7)
            . $this->number(-1) . $this->number(1) . $this->number(-2) . $this->bytes($ec['x']) . $this->number(-3) . $this->bytes($ec['y']);
        $authData = hash('sha256', 'localhost', true) . chr($verified ? 0x45 : 0x41) . pack('N', 0)
            . str_repeat("\0", 16) . pack('n', strlen($this->id)) . $this->id . $cose;
        $attestation = $this->header(5, 3) . $this->text('fmt') . $this->text('none')
            . $this->text('attStmt') . $this->header(5, 0) . $this->text('authData') . $this->bytes($authData);

        return ['id' => PasskeyService::encode($this->id), 'name' => 'Test security key', 'response' => [
            'clientDataJSON' => PasskeyService::encode($this->clientData($challenge, $origin, 'webauthn.create')),
            'attestationObject' => PasskeyService::encode($attestation), 'transports' => ['internal'],
        ]];
    }

    public function assertion(string $challenge, User $user, string $origin = 'http://localhost:8083', int $counter = 1, bool $verified = true): array
    {
        $clientData = $this->clientData($challenge, $origin, 'webauthn.get');
        $authData = hash('sha256', 'localhost', true) . chr($verified ? 0x05 : 0x01) . pack('N', $counter);
        openssl_sign($authData . hash('sha256', $clientData, true), $signature, $this->key, OPENSSL_ALGO_SHA256);

        return ['id' => PasskeyService::encode($this->id), 'response' => [
            'clientDataJSON' => PasskeyService::encode($clientData), 'authenticatorData' => PasskeyService::encode($authData),
            'signature' => PasskeyService::encode($signature), 'userHandle' => PasskeyService::encode($user->uuid),
        ]];
    }
}
