<?php

namespace Pterodactyl\Console\Commands\Maintenance;

use Illuminate\Console\Command;
use Pterodactyl\Models\FileTrashItem;
use Pterodactyl\Services\Files\FileTrashService;

class PruneFileTrashCommand extends Command
{
    protected $signature = 'p:maintenance:prune-file-trash';

    protected $description = 'Permanently delete expired server trash, retaining records for retry when Wings is unavailable.';

    public function handle(FileTrashService $trash): int
    {
        $failedNodes = [];
        $failed = false;
        FileTrashItem::with('server')->where('expires_at', '<=', now())->chunkById(100, function ($items) use ($trash, &$failedNodes, &$failed) {
            foreach ($items as $item) {
                if (isset($failedNodes[$item->server->node_id])) {
                    continue;
                }
                try {
                    $trash->purge($item->server, $item, true);
                } catch (\Throwable) {
                    $failed = true;
                    $failedNodes[$item->server->node_id] = true;
                    $this->warn('Unable to prune trash on node ' . $item->server->node_id . '. Items will be retried at the next cleanup.');
                }
            }
        });

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
