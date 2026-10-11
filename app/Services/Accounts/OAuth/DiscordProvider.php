<?php

namespace Pterodactyl\Services\Accounts\OAuth;

use Laravel\Socialite\Two\User;
use Laravel\Socialite\Two\AbstractProvider;

class DiscordProvider extends AbstractProvider
{
    protected $scopes = ['identify', 'email'];

    protected $scopeSeparator = ' ';

    protected function getAuthUrl($state)
    {
        return $this->buildAuthUrlFromBase('https://discord.com/oauth2/authorize', $state);
    }

    protected function getTokenUrl()
    {
        return 'https://discord.com/api/oauth2/token';
    }

    protected function getUserByToken($token)
    {
        return json_decode($this->getHttpClient()->get('https://discord.com/api/users/@me', [
            'headers' => ['Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json'],
        ])->getBody(), true, 32, JSON_THROW_ON_ERROR);
    }

    protected function mapUserToObject(array $user)
    {
        return (new User())->setRaw($user)->map([
            'id' => $user['id'], 'nickname' => $user['username'] ?? null,
            'name' => $user['global_name'] ?? $user['username'] ?? null,
            'email' => $user['email'] ?? null,
        ]);
    }
}
