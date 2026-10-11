<?php

namespace Pterodactyl\Services\Accounts\OAuth;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class OpenIdConnectDiscovery
{
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
        $response = Http::acceptJson()->connectTimeout(5)->timeout(10)->withoutRedirecting()->get($url)->throw();
        if (strlen($response->body()) > 1048576 || !is_array($document = $response->json())) {
            throw new \RuntimeException('Invalid OpenID Connect document.');
        }

        return $document;
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
