<?php

namespace Pterodactyl\Tests\Fixtures;

class SerializableWakeupProbe
{
    public static bool $awakened = false;

    public function __wakeup(): void
    {
        self::$awakened = true;
    }
}
