<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Pterodactyl\Models\Server;
use Illuminate\Http\JsonResponse;
use Pterodactyl\Facades\Activity;
use Pterodactyl\Models\FileTrashItem;
use Pterodactyl\Services\Files\FileTrashService;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Http\Requests\Api\Client\Servers\Files\TrashItemRequest;
use Pterodactyl\Http\Requests\Api\Client\Servers\Files\TrashFilesRequest;

class FileTrashController extends ClientApiController
{
    public function index(TrashItemRequest $request, Server $server, FileTrashService $trash): JsonResponse
    {
        $page = FileTrashItem::where('server_id', $server->id)->orderByDesc('id')->paginate(25);
        foreach ($page as $item) {
            if (!$item->ready || $item->restore_started_at !== null) {
                $trash->reconcile($server, $item);
            }
        }
        if ($page->getCollection()->contains(fn ($item) => !$item->exists)) {
            $page = FileTrashItem::where('server_id', $server->id)->orderByDesc('id')->paginate(25);
        }

        return new JsonResponse([
            'data' => $page->getCollection()->map(fn ($item) => [
                'id' => $item->uuid,
                'name' => basename($item->original_path),
                'path' => $item->original_path,
                'is_file' => $item->is_file,
                'ready' => $item->ready,
                'deleted_at' => $item->created_at->toIso8601String(),
                'expires_at' => $item->expires_at->toIso8601String(),
            ]),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function store(TrashFilesRequest $request, Server $server, FileTrashService $trash): JsonResponse
    {
        $trash->move($server, $request->validated('root'), $request->validated('files'));
        Activity::event('server:file.trash.move')->property('files', $request->validated('files'))->log();

        return new JsonResponse([], 204);
    }

    public function restore(TrashItemRequest $request, Server $server, string $item, FileTrashService $trash): JsonResponse
    {
        $record = FileTrashItem::where('server_id', $server->id)->where('uuid', $item)->firstOrFail();
        $trash->restore($server, $record);
        Activity::event('server:file.trash.restore')->property('file', $record->original_path)->log();

        return new JsonResponse([], 204);
    }

    public function destroy(TrashItemRequest $request, Server $server, string $item, FileTrashService $trash): JsonResponse
    {
        $record = FileTrashItem::where('server_id', $server->id)->where('uuid', $item)->firstOrFail();
        $trash->purge($server, $record);
        Activity::event('server:file.trash.delete')->property('file', $record->original_path)->log();

        return new JsonResponse([], 204);
    }
}
