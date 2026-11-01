<?php

namespace Pterodactyl\Services\Files;

use Illuminate\Support\Str;
use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Models\FileTrashItem;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

class FileTrashService
{
    public function __construct(private DaemonFileRepository $files)
    {
    }

    public function move(Server $server, string $root, array $names): void
    {
        $root = TrashPath::normalize($root);
        if (TrashPath::isReserved($root)) {
            throw new BadRequestHttpException('The trash storage directory is reserved.');
        }
        $this->locked($server, function () use ($server, $root, $names) {
            $repository = $this->files->setServer($server);
            $entries = collect($repository->getDirectory($root))->keyBy('name');
            // Validate the complete selection before moving anything.
            foreach ($names as $name) {
                if (!is_string($name) || in_array($name, ['', '.', '..', TrashPath::DIRECTORY], true) || strpbrk($name, "/\\\0") !== false) {
                    throw new BadRequestHttpException('Select files from one directory.');
                }
                if (!$entries->has($name)) {
                    throw new NotFoundHttpException('A selected file no longer exists. Refresh the file list.');
                }
            }
            $repository->createDirectory(TrashPath::DIRECTORY, '/');
            foreach ($names as $name) {
                // Persist the recovery location before moving the file. An uncertain
                // Wings response must never orphan a successfully moved file.
                $item = FileTrashItem::create([
                    'uuid' => (string) Str::uuid(),
                    'server_id' => $server->id,
                    'original_path' => TrashPath::normalize($root . '/' . $name),
                    'is_file' => (bool) $entries[$name]['file'],
                    'expires_at' => now()->addDays((int) config('aquadactyl.trash.retention_days', 7)),
                    'ready' => false,
                ]);
                $repository->createDirectory($item->uuid, '/' . TrashPath::DIRECTORY);
                $repository->renameFiles('/', [['from' => ltrim($item->original_path, '/'), 'to' => ltrim($this->storagePath($item) . '/' . $name, '/')]]);
                $this->reconcile($server, $item);
                if (!$item->ready) {
                    throw new ConflictHttpException('The move could not be confirmed. Check the file list and trash before retrying.');
                }
            }
        });
    }

    public function reconcile(Server $server, FileTrashItem $item): void
    {
        if ($item->ready && $item->restore_started_at === null) {
            return;
        }
        $stored = collect($this->directory($server, $this->storagePath($item)))->contains('name', basename($item->original_path));
        if ($item->restore_started_at !== null && !$stored
            && collect($this->directory($server, dirname($item->original_path)))->contains('name', basename($item->original_path))) {
            // The rename completed but its response was lost. Forget only the
            // empty recovery container; the restored file must stay untouched.
            $this->files->setServer($server)->deleteFiles('/' . TrashPath::DIRECTORY, [$item->uuid]);
            $item->delete();

            return;
        }
        if (!$item->ready && $stored) {
            $item->update(['ready' => true]);
        }
    }

    public function restore(Server $server, FileTrashItem $item): void
    {
        $this->locked($server, function () use ($server, $item) {
            $item = FileTrashItem::where('server_id', $server->id)->where('uuid', $item->uuid)->firstOrFail();
            if (!$item->expires_at->isFuture()) {
                throw new ConflictHttpException('This item has expired and can no longer be restored.');
            }
            $this->reconcile($server, $item);
            if (!$item->exists) {
                return;
            }
            if (!$item->ready) {
                throw new ConflictHttpException('This item is unavailable on Wings. Refresh the trash and try again.');
            }
            $parent = dirname($item->original_path);
            $this->ensureDirectory($server, $parent);
            if (collect($this->directory($server, $parent))->contains('name', basename($item->original_path))) {
                throw new ConflictHttpException('A file or directory already exists at the original location. Rename or move it before restoring.');
            }
            $repository = $this->files->setServer($server);
            $item->update(['restore_started_at' => now()]);
            $repository->renameFiles('/', [['from' => ltrim($this->storagePath($item) . '/' . basename($item->original_path), '/'), 'to' => ltrim($item->original_path, '/')]]);
            // Wings can return success for a missing rename source. Verify the move.
            if (!collect($this->directory($server, $parent))->contains('name', basename($item->original_path))
                || collect($this->directory($server, $this->storagePath($item)))->contains('name', basename($item->original_path))) {
                throw new ConflictHttpException('The restore could not be confirmed. Refresh the file list and trash.');
            }
            $repository->deleteFiles('/' . TrashPath::DIRECTORY, [$item->uuid]);
            $item->delete();
        });
    }

    public function purge(Server $server, FileTrashItem $item, bool $expiredOnly = false): void
    {
        $this->locked($server, function () use ($server, $item, $expiredOnly) {
            $current = FileTrashItem::where('server_id', $server->id)->where('uuid', $item->uuid)->first();
            if (!$current || ($expiredOnly && $current->expires_at->isFuture())) {
                return;
            }
            $this->storagePath($current); // Validate the owned storage identifier.
            $this->files->setServer($server)->deleteFiles('/' . TrashPath::DIRECTORY, [$current->uuid]);
            $current->delete();
        });
    }

    private function storagePath(FileTrashItem $item): string
    {
        if (!Str::isUuid($item->uuid)) {
            throw new \RuntimeException('Invalid trash storage identifier.');
        }

        return '/' . TrashPath::DIRECTORY . '/' . $item->uuid;
    }

    private function directory(Server $server, string $path): array
    {
        try {
            return $this->files->setServer($server)->getDirectory($path);
        } catch (DaemonConnectionException $exception) {
            if ($exception->getStatusCode() !== 404) {
                throw $exception;
            }

            return [];
        }
    }

    private function ensureDirectory(Server $server, string $path): void
    {
        $current = '/';
        foreach (array_filter(explode('/', $path), fn ($part) => $part !== '') as $name) {
            $existing = collect($this->directory($server, $current))->firstWhere('name', $name);
            if ($existing && ($existing['file'] || ($existing['symlink'] ?? false))) {
                throw new ConflictHttpException('The original parent directory is now a file or symlink. Move it before restoring.');
            }
            if (!$existing) {
                $this->files->setServer($server)->createDirectory($name, $current);
            }
            $current = TrashPath::normalize($current . '/' . $name);
        }
    }

    private function locked(Server $server, callable $callback): mixed
    {
        return Cache::lock('file-trash:' . $server->id, 600)->block(5, $callback);
    }
}
