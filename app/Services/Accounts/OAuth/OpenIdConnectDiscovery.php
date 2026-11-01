<?php

namespace Pterodactyl\Services\Accounts\OAuth;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class OpenIdConnectDiscovery
{
    private const MAX_BYTES = 1048576;

    public static function requireHttps(string $url): void
    {
        $parts = parse_url($url);
        if (!$parts || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host'])
            || isset($parts['user']) || isset($parts['pass']) || isset($parts['fragment'])) {
            throw new \RuntimeException('OpenID Connect endpoints must use HTTPS.');
        }
    }

    public function document(string $url): array
    {
        self::requireHttps($url);
        $deadline = hrtime(true) + 10_000_000_000;
        $response = Http::acceptJson()->connectTimeout(5)->timeout(10)->withoutRedirecting()
            ->withOptions(['stream' => true, 'read_timeout' => 5])->get($url);
        $body = $response->toPsrResponse()->getBody();
        try {
            if (!$response->successful()) {
                throw new \RuntimeException('Could not retrieve OpenID Connect document.');
            }
            $json = '';
            while (true) {
                $chunk = $body->read(min(8192, self::MAX_BYTES + 1 - strlen($json)));
                if (hrtime(true) >= $deadline) {
                    throw new \RuntimeException('OpenID Connect document download timed out.');
                }
                if ($chunk === '') {
                    if (!$body->eof()) {
                        throw new \RuntimeException('Invalid OpenID Connect document.');
                    }
                    break;
                }
                $json .= $chunk;
                if (strlen($json) > self::MAX_BYTES) {
                    throw new \RuntimeException('Invalid OpenID Connect document.');
                }
            }
            if (!is_array($document = json_decode($json, true, 32))) {
                throw new \RuntimeException('Invalid OpenID Connect document.');
            }

            return $document;
        } finally {
            $body->close();
        }
    }

    public function metadata(string $issuer): array
    {
        self::requireHttps($issuer);

        return Cache::remember('oauth:discovery:' . hash('sha256', $issuer), 300, function () use ($issuer) {
            $document = $this->document(rtrim($issuer, '/') . '/.well-known/openid-configuration');
            if (($document['issuer'] ?? null) !== $issuer) {
                throw new \RuntimeException('OpenID Connect issuer mismatch.');
            }
            foreach (['authorization_endpoint', 'token_endpoint', 'jwks_uri'] as $key) {
                self::requireHttps($document[$key] ?? '');
            }
            if (!in_array('S256', $document['code_challenge_methods_supported'] ?? [], true)) {
                throw new \RuntimeException('The OpenID Connect provider must support PKCE S256.');
            }

            return $document;
        });
    }

    public function keys(string $url): array
    {
        return Cache::remember('oauth:jwks:' . hash('sha256', $url), 300, fn () => $this->document($url));
    }
}
