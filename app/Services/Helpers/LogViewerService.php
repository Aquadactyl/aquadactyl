<?php

namespace Pterodactyl\Services\Helpers;

class LogViewerService
{
    /**
     * Get a list of all available log files in storage/logs.
     */
    public function getLogFiles(): array
    {
        $logPath = storage_path('logs');
        if (!is_dir($logPath)) {
            return [];
        }

        $files = [];
        $iterator = new \DirectoryIterator($logPath);

        foreach ($iterator as $fileInfo) {
            if ($fileInfo->isDot() || $fileInfo->isLink() || !$fileInfo->isFile() || $fileInfo->getExtension() !== 'log') {
                continue;
            }

            $sizeBytes = $fileInfo->getSize();
            $files[] = [
                'name' => $fileInfo->getFilename(),
                'size' => $this->formatBytes($sizeBytes),
                'size_bytes' => $sizeBytes,
                'modified' => $fileInfo->getMTime(),
                'modified_formatted' => date('Y-m-d H:i:s', $fileInfo->getMTime()),
            ];
        }

        // Sort files by modified time descending (newest first)
        usort($files, fn ($a, $b) => $b['modified'] <=> $a['modified']);

        return $files;
    }

    /**
     * Get the raw content of a specific log file safely.
     */
    public function getLogContent(string $filename, int $maxBytes = 4 * 1024 * 1024): string
    {
        $safeName = basename($filename);
        if ($safeName === '' || !str_ends_with($safeName, '.log')) {
            return '';
        }

        $path = $this->getLogPath($safeName);
        if ($path === null) {
            return '';
        }

        return $this->readFileTail($path, $maxBytes);
    }

    /**
     * Parse log entries from a given log file.
     */
    public function getLogEntries(string $filename, int $maxEntries = 500): array
    {
        $safeName = basename($filename);
        $path = $this->getLogPath($safeName);

        if ($path === null) {
            return [
                'entries' => [],
                'counts' => ['all' => 0, 'error' => 0, 'warning' => 0, 'info' => 0, 'debug' => 0],
                'raw' => '',
            ];
        }

        $content = $this->readFileTail($path, 4 * 1024 * 1024); // read up to last 4 MB
        $lines = explode("\n", $content);

        $entries = [];
        $current = null;
        $pattern = '/^\[(?<date>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] (?<env>[a-zA-Z0-9_\-]+)\.(?<level>[A-Z]+): (?<message>.*)$/';

        foreach ($lines as $line) {
            $trimmed = rtrim($line, "\r");

            if (preg_match($pattern, $trimmed, $matches)) {
                if ($current !== null) {
                    $entries[] = $current;
                }

                $level = strtoupper($matches['level']);
                $current = [
                    'date' => $matches['date'],
                    'env' => $matches['env'],
                    'level' => $level,
                    'level_class' => $this->getLevelClass($level),
                    'message' => $matches['message'],
                    'stack' => '',
                ];
            } elseif ($current !== null) {
                if ($current['stack'] === '') {
                    $current['stack'] = $trimmed;
                } else {
                    $current['stack'] .= "\n" . $trimmed;
                }
            }
        }

        if ($current !== null) {
            $entries[] = $current;
        }

        // Sort entries newest first
        $entries = array_reverse($entries);

        // Calculate counts
        $counts = [
            'all' => count($entries),
            'error' => 0,
            'warning' => 0,
            'info' => 0,
            'debug' => 0,
        ];

        foreach ($entries as $entry) {
            $lvl = $entry['level'];
            if (in_array($lvl, ['EMERGENCY', 'ALERT', 'CRITICAL', 'ERROR'])) {
                ++$counts['error'];
            } elseif ($lvl === 'WARNING') {
                ++$counts['warning'];
            } elseif (in_array($lvl, ['NOTICE', 'INFO'])) {
                ++$counts['info'];
            } elseif ($lvl === 'DEBUG') {
                ++$counts['debug'];
            }
        }

        if (count($entries) > $maxEntries) {
            $entries = array_slice($entries, 0, $maxEntries);
        }

        return [
            'entries' => $entries,
            'counts' => $counts,
            'raw' => mb_substr($content, -200000), // last 200KB for raw tab
        ];
    }

    /**
     * Delete a log file.
     */
    public function deleteLog(string $filename): bool
    {
        $safeName = basename($filename);
        if ($safeName === '' || !str_ends_with($safeName, '.log')) {
            return false;
        }

        $path = $this->getLogPath($safeName);
        if ($path !== null) {
            return @unlink($path);
        }

        return false;
    }

    /**
     * Get the safe path to a log file for download.
     */
    public function getLogPath(string $filename): ?string
    {
        $safeName = basename($filename);
        if ($safeName === '' || !str_ends_with($safeName, '.log')) {
            return null;
        }

        $path = storage_path('logs/' . $safeName);

        return !is_link($path) && is_file($path) ? $path : null;
    }

    /**
     * Read the last N bytes of a file safely.
     */
    protected function readFileTail(string $path, int $maxBytes): string
    {
        $size = filesize($path);
        if ($size === false || $size === 0) {
            return '';
        }

        if ($size <= $maxBytes) {
            return file_get_contents($path) ?: '';
        }

        $handle = fopen($path, 'rb');
        if (!$handle) {
            return '';
        }

        fseek($handle, -$maxBytes, SEEK_END);
        $content = stream_get_contents($handle);
        fclose($handle);

        if ($content === false) {
            return '';
        }

        // Discard the first potentially partial line
        $firstNewline = strpos($content, "\n");
        if ($firstNewline !== false) {
            $content = substr($content, $firstNewline + 1);
        }

        return $content;
    }

    /**
     * Get CSS badge class for a log level.
     */
    protected function getLevelClass(string $level): string
    {
        return match ($level) {
            'EMERGENCY', 'ALERT', 'CRITICAL', 'ERROR' => 'label-danger',
            'WARNING' => 'label-warning',
            'NOTICE', 'INFO' => 'label-info',
            'DEBUG' => 'label-default',
            default => 'label-primary',
        };
    }

    /**
     * Format byte sizes into readable strings.
     */
    protected function formatBytes(int $bytes, int $precision = 1): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);

        $bytes /= (1 << (10 * $pow));

        return round($bytes, $precision) . ' ' . $units[$pow];
    }
}
