<?php

namespace Pterodactyl\Services\Updates;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class ReleaseCatalog
{
    public const REPOSITORIES = ['panel' => 'Aquadactyl/aquadactyl', 'manta' => 'Aquadactyl/manta', 'wings' => 'pterodactyl/wings'];

    public function latest(string $product): array
    {
        $repository = self::REPOSITORIES[$product];

        return Cache::remember('aquadactyl-release:' . $product, 3600, function () use ($repository) {
            $empty = ['tag' => null, 'notes' => '', 'url' => 'https://github.com/' . $repository . '/releases', 'error' => null];
            try {
                $response = Http::acceptJson()->withUserAgent('Aquadactyl-Update-Checker')->connectTimeout(3)->timeout(8)
                    ->withoutRedirecting()->withOptions(['stream' => true, 'read_timeout' => 3])
                    ->get('https://api.github.com/repos/' . $repository . '/releases/latest');
                $stream = $response->toPsrResponse()->getBody();
                try {
                    if ($response->status() === 404) {
                        return $empty;
                    }
                    if (!$response->successful()) {
                        throw new \RuntimeException();
                    }
                    $json = '';
                    $deadline = hrtime(true) + 8_000_000_000;
                    while (!$stream->eof()) {
                        $chunk = $stream->read(8192);
                        $json .= $chunk;
                        if (strlen($json) > 1048576 || hrtime(true) >= $deadline || ($chunk === '' && !$this->ended($stream))) {
                            throw new \RuntimeException();
                        }
                    }
                    $data = json_decode($json, true, 32, JSON_THROW_ON_ERROR);
                    if (!is_array($data) || !is_string($data['tag_name'] ?? null) || !preg_match('/^v?[0-9]+\.[0-9]+\.[0-9]+$/D', $data['tag_name'])) {
                        throw new \RuntimeException();
                    }
                    if (($data['draft'] ?? false) || ($data['prerelease'] ?? false)) {
                        return $empty;
                    }

                    return ['tag' => $data['tag_name'], 'notes' => mb_substr(is_string($data['body'] ?? null) ? $data['body'] : '', 0, 16000), 'url' => $empty['url'] . '/tag/' . rawurlencode($data['tag_name']), 'error' => null];
                } finally {
                    $stream->close();
                }
            } catch (\Throwable) {
                return array_replace($empty, ['error' => 'Release information is temporarily unavailable.']);
            }
        });
    }

    /** @phpstan-impure */
    private function ended(\Psr\Http\Message\StreamInterface $stream): bool
    {
        return $stream->eof();
    }
}
