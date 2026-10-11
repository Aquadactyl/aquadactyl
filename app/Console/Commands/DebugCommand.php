<?php

namespace Pterodactyl\Console\Commands;

use Illuminate\Console\Command;
use Pterodactyl\Services\Debug\DebugPasteService;

class DebugCommand extends Command
{
    protected $description = 'Uploads a redacted panel log tail to the Aquadactyl debug service.';

    protected $signature = 'p:debug
                            {--file= : A log file to upload instead of storage/logs/laravel.log}
                            {--expires= : Expiration in seconds, or 0 to omit expiration}';

    public function __construct(private DebugPasteService $debugPasteService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        try {
            $expires = $this->option('expires');
            $expiresIn = $expires === null ? null : max(0, (int) $expires);
            $url = $this->debugPasteService->upload(
                $this->debugPasteService->readLog($this->option('file')),
                $expiresIn,
            );
        } catch (\Throwable $exception) {
            $this->components->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->components->info('Debug log uploaded. Share this URL with support:');
        $this->line($url);

        return self::SUCCESS;
    }
}
