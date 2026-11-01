<?php

namespace Pterodactyl\Http\Middleware\Api\Client\Server;

use Illuminate\Http\Request;
use Pterodactyl\Services\Files\TrashPath;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class ProtectTrashDirectory
{
    public function handle(Request $request, \Closure $next): mixed
    {
        $root = $request->input('root', '/');
        $root = is_string($root) ? $root : '/';
        $paths = [];
        foreach (['root', 'directory', 'file', 'location'] as $key) {
            if (is_string($request->input($key))) {
                $paths[] = $request->input($key);
            }
        }
        foreach (['name', 'filename'] as $key) {
            if (is_string($request->input($key))) {
                $paths[] = $root . '/' . $request->input($key);
            }
        }
        foreach ((array) $request->input('files', []) as $file) {
            $names = is_array($file) ? array_intersect_key($file, array_flip(['from', 'to', 'file'])) : [$file];
            foreach ($names as $name) {
                if (is_string($name)) {
                    $paths[] = str_starts_with($name, '/') ? $name : $root . '/' . $name;
                }
            }
        }
        foreach ($paths as $path) {
            if (TrashPath::isReserved(rawurldecode($path))) {
                throw new BadRequestHttpException('The trash storage directory is reserved. Use the server trash controls.');
            }
        }

        return $next($request);
    }
}
