<?php

namespace Pterodactyl\Services\Accounts\OAuth;

use GuzzleHttp\Client;
use Laravel\Socialite\SocialiteManager;
use Laravel\Socialite\Two\GithubProvider;
use Laravel\Socialite\Two\GoogleProvider;
use Laravel\Socialite\Two\AbstractProvider;

class OAuthProviderFactory
{
    public function make(array $config, string $nonce): AbstractProvider
    {
        $class = match ($config['id']) {
            'discord' => DiscordProvider::class,
            'github' => GithubProvider::class,
            'google' => GoogleProvider::class,
            'oidc' => OpenIdConnectProvider::class,
        };
        $provider = app(SocialiteManager::class)->buildProvider($class, $config);
        $provider->setHttpClient(new Client(['timeout' => 15, 'connect_timeout' => 5, 'allow_redirects' => false]));
        if ($provider instanceof OpenIdConnectProvider) {
            $provider->configure(app(OpenIdConnectDiscovery::class)->metadata($config['issuer']), $nonce);
        }
        // Discord does not document PKCE for confidential OAuth applications.
        if ($config['id'] !== 'discord') {
            $provider->enablePKCE();
        }

        return $provider;
    }
}
