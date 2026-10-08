<?php

namespace Pterodactyl\Support;

class Countries
{
    public static function normalize(?string $code): ?string
    {
        $code = strtoupper(trim($code ?? ''));

        return $code === '' ? null : ($code === 'UK' ? 'GB' : $code);
    }

    public static function name(?string $code): ?string
    {
        $code = self::normalize($code);

        return $code ? (config('countries')[$code] ?? null) : null;
    }
}
