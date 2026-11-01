<?php

namespace Pterodactyl\Services\Files;

use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class TrashPath
{
    public const DIRECTORY = '.aquadactyl-trash';

    public static function normalize(string $path): string
    {
        if (str_contains($path, "\0") || str_contains($path, '\\')) {
            throw new BadRequestHttpException('Invalid file path.');
        }
        $segments = [];
        foreach (explode('/', $path) as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }
            if ($segment === '..') {
                if ($segments === []) {
                    throw new BadRequestHttpException('File paths cannot escape the server directory.');
                }
                array_pop($segments);
            } else {
                $segments[] = $segment;
            }
        }

        return '/' . implode('/', $segments);
    }

    public static function isReserved(string $path): bool
    {
        return in_array(self::DIRECTORY, explode('/', self::normalize($path)), true);
    }
}
