<?php

namespace Pterodactyl\Console\Commands;

use Illuminate\Console\Command;
use Pterodactyl\Services\Debug\DebugPasteService;

class DebugCommand extends Command
{
    protected $description = 'Uploads a redacted panel log tail to the Aquadactyl debug service.';

    protected $signature = 'p:debug
                            {--file= : A log file to use instead of the configured panel log}
                            {--dry-run : Preview the redacted log locally without uploading it}
                            {--expires= : Expiration in seconds: 3600, 86400, 172800, 604800, 2592000; 0 disables expiration}';

    public function __construct(private DebugPasteService $debugPasteService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        try {
            $expires = $this->option('expires');
            if ($expires !== null && filter_var($expires, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]) === false) {
                $this->components->error('Expiration must be a non-negative number of seconds.');

                return self::FAILURE;
            }
            $content = $this->debugPasteService->readLog($this->option('file'));
            if ($this->option('dry-run')) {
                $this->output->write($this->debugPasteService->redact($content), false, \Symfony\Component\Console\Output\OutputInterface::OUTPUT_RAW);

                return self::SUCCESS;
            }
            $expiresIn = $expires === null ? null : (int) $expires;
            $url = $this->debugPasteService->upload(
                $content,
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
