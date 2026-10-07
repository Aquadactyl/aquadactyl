<?php

namespace Pterodactyl\Console\Commands\Maintenance;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\ExecutableFinder;

class BackupDatabaseCommand extends Command
{
    protected $signature = 'p:maintenance:backup-database {path : New SQL backup file outside the public directory}';

    protected $description = 'Stream a consistent MySQL or MariaDB backup without exposing credentials in arguments.';

    public function handle(): int
    {
        $connection = config('database.connections.' . config('database.default'));
        $binary = (new ExecutableFinder())->find('mariadb-dump') ?? (new ExecutableFinder())->find('mysqldump');
        $path = $this->argument('path');
        $directory = realpath(dirname($path));

        if (($connection['driver'] ?? '') !== 'mysql' || !$binary || !$directory
            || str_starts_with($directory . DIRECTORY_SEPARATOR, realpath(public_path()) . DIRECTORY_SEPARATOR)) {
            $this->error('A MySQL connection, a dump client, and a backup directory outside public/ are required.');

            return self::FAILURE;
        }

        $handle = fopen($path, 'x');
        if (!$handle) {
            $this->error('Cannot create backup file; existing backups are never overwritten.');

            return self::FAILURE;
        }
        chmod($path, 0600);

        $arguments = [$binary, '--single-transaction', '--quick', '--no-tablespaces', '--skip-lock-tables'];
        if (!empty($connection['unix_socket'])) {
            $arguments[] = '--socket=' . $connection['unix_socket'];
        } else {
            $arguments[] = '--host=' . $connection['host'];
            $arguments[] = '--port=' . $connection['port'];
        }
        $arguments[] = '--user=' . $connection['username'];
        $arguments[] = '--';
        $arguments[] = $connection['database'];

        $process = new Process($arguments, null, ['MYSQL_PWD' => (string) $connection['password']]);
        $process->setTimeout(null);
        try {
            $process->run(function (string $type, string $buffer) use ($handle, $process) {
                if ($type === Process::OUT) {
                    if (fwrite($handle, $buffer) !== strlen($buffer)) {
                        throw new \RuntimeException('Cannot write database backup.');
                    }
                    $process->clearOutput();
                } else {
                    $process->clearErrorOutput();
                }
            });
        } catch (\Throwable $exception) {
            $process->stop();
            fclose($handle);
            unlink($path);
            $this->error('Cannot complete database backup.');

            return self::FAILURE;
        } finally {
            if (is_resource($handle)) {
                fclose($handle);
            }
        }

        if (!$process->isSuccessful()) {
            unlink($path);
            $this->error('Database backup failed. Check the dump client and database permissions.');

            return self::FAILURE;
        }

        $this->info('Database backup created.');

        return self::SUCCESS;
    }
}
