<?php

namespace Pterodactyl\Services\Accounts\OAuth;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Laravel\Socialite\Two\User;
use Laravel\Socialite\Two\AbstractProvider;

class OpenIdConnectProvider extends AbstractProvider
{
    protected $scopes = ['openid', 'profile', 'email'];

    protected $scopeSeparator = ' ';

    private array $metadata;

    private string $nonce;

    private ?string $idToken = null;

    public function configure(array $metadata, string $nonce): self
    {
        $this->metadata = $metadata;
        $this->nonce = $nonce;

        return $this;
    }

    protected function getAuthUrl($state)
    {
        return $this->buildAuthUrlFromBase($this->metadata['authorization_endpoint'], $state);
    }

    protected function getCodeFields($state = null)
    {
        return parent::getCodeFields($state) + ['nonce' => $this->nonce];
    }

    protected function getTokenUrl()
    {
        return $this->metadata['token_endpoint'];
    }

    public function getAccessTokenResponse($code)
    {
        $fields = $this->getTokenFields($code);
        $options = ['headers' => ['Accept' => 'application/json'], 'form_params' => $fields];
        $methods = $this->metadata['token_endpoint_auth_methods_supported'] ?? ['client_secret_basic'];
        if (in_array('client_secret_basic', $methods, true)) {
            $options['auth'] = [urlencode($this->clientId), urlencode($this->clientSecret)];
            unset($options['form_params']['client_id'], $options['form_params']['client_secret']);
        } elseif (!in_array('client_secret_post', $methods, true)) {
            throw new \RuntimeException('Unsupported OpenID Connect client authentication method.');
        }
        $response = json_decode($this->getHttpClient()->post($this->getTokenUrl(), $options)->getBody(), true, 32, JSON_THROW_ON_ERROR);
        $this->idToken = $response['id_token'] ?? null;

        return $response;
    }

    protected function getUserByToken($token)
    {
        if (!$this->idToken || strlen($this->idToken) > 65536) {
            throw new \RuntimeException('Missing OpenID Connect ID token.');
        }
        $header = JWT::jsonDecode(JWT::urlsafeB64Decode(explode('.', $this->idToken)[0]));
        if (!in_array($header->alg ?? '', ['RS256', 'ES256'], true)) {
            throw new \RuntimeException('Unsupported OpenID Connect signing algorithm.');
        }
        $jwks = app(OpenIdConnectDiscovery::class)->keys($this->metadata['jwks_uri']);
        // Reject encryption keys and algorithms outside the explicit allowlist.
        $jwks['keys'] = array_values(array_filter($jwks['keys'] ?? [], fn ($key) => ($key['use'] ?? 'sig') === 'sig' && in_array($key['alg'] ?? 'RS256', ['RS256', 'ES256'], true)));
        $claims = (array) JWT::decode($this->idToken, JWK::parseKeySet($jwks, 'RS256'));
        $audiences = is_array($claims['aud'] ?? null) ? $claims['aud'] : [$claims['aud'] ?? null];
        if (($claims['iss'] ?? '') !== $this->metadata['issuer'] || !in_array($this->clientId, $audiences, true)
            || (count($audiences) > 1 && ($claims['azp'] ?? '') !== $this->clientId)
            || (isset($claims['azp']) && $claims['azp'] !== $this->clientId)
            || !is_string($claims['nonce'] ?? null) || !hash_equals($this->nonce, $claims['nonce'])
            || !is_int($claims['exp'] ?? null) || $claims['exp'] <= time()
            || !is_int($claims['iat'] ?? null) || $claims['iat'] > time() + 60
            || !is_string($claims['sub'] ?? null) || $claims['sub'] === '' || strlen($claims['sub']) > 255) {
            throw new \RuntimeException('Invalid OpenID Connect ID token claims.');
        }

        return $claims;
    }

    protected function mapUserToObject(array $user)
    {
        return (new User())->setRaw($user)->map(['id' => $user['sub'], 'name' => $user['name'] ?? null, 'email' => $user['email'] ?? null]);
    }
}
