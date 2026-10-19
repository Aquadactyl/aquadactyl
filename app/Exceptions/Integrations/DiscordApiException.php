<?php

namespace Pterodactyl\Exceptions\Integrations;

class DiscordApiException extends \RuntimeException
{
    public function __construct(string $message, public int $retryAfter = 60)
    {
        parent::__construct($message);
    }
}
