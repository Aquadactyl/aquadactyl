<?php

namespace Pterodactyl\Services\Updates;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class ReleaseCatalog
{
    public const REPOSITORIES = ['panel' => 'Aquadactyl/aquadactyl', 'manta' => 'Aquadactyl/manta', 'wings' => 'pterodactyl/wings'];

    public function latest(string $product, ?string $installedVersion = null): array
    {
        return $this->release($product, includePrereleases: SoftwareVersion::isPrerelease($installedVersion ?? ''));
    }

    public function forPanelVersion(string $version): array
    {
        $tag = preg_match('/^canary(?:\+[a-f0-9]{8,64})?$/D', $version) ? 'canary' : $version;
        if (!preg_match('/^(?:canary|v?[0-9]+(?:\.[0-9]+){0,2}(?:-[0-9A-Za-z][0-9A-Za-z.-]*)?)$/D', $tag) || strlen($tag) > 100) {
            return $this->emptyRelease(self::REPOSITORIES['panel']);
        }
        $release = $this->release('panel', $tag);
        if ($tag !== 'canary' && $release['tag'] === null && $release['error'] === null) {
            // Releases may spell the installed version with or without a leading v.
            return $this->release('panel', str_starts_with($tag, 'v') ? substr($tag, 1) : 'v' . $tag);
        }

        return $release;
    }

    private function release(string $product, ?string $tag = null, bool $includePrereleases = false): array
    {
        $repository = self::REPOSITORIES[$product];

        return Cache::remember('aquadactyl-release:v2:' . $product . ($tag === null ? ($includePrereleases ? ':prereleases' : ':stable') : ':tag:' . $tag), 3600, function () use ($repository, $tag, $includePrereleases) {
            $empty = $this->emptyRelease($repository);
            try {
                $response = Http::acceptJson()->withUserAgent('Aquadactyl-Update-Checker')->connectTimeout(3)->timeout(8)
                    ->withoutRedirecting()->withOptions(['stream' => true, 'read_timeout' => 3])
                    ->get('https://api.github.com/repos/' . $repository . '/releases' . ($includePrereleases ? '?per_page=30' : '/' . ($tag === null ? 'latest' : 'tags/' . rawurlencode($tag))));
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
                    if ($includePrereleases) {
                        if (!is_array($data) || !array_is_list($data)) {
                            throw new \RuntimeException();
                        }
                        $candidate = null;
                        foreach ($data as $release) {
                            if (!is_array($release) || ($release['draft'] ?? false) || !is_string($release['tag_name'] ?? null) || SoftwareVersion::parse($release['tag_name']) === null) {
                                continue;
                            }
                            if ($candidate === null || SoftwareVersion::newer($candidate['tag_name'], $release['tag_name'])) {
                                $candidate = $release;
                            }
                        }
                        if ($candidate === null) {
                            return $empty;
                        }
                        $data = $candidate;
                    }
                    if (!is_array($data) || !is_string($data['tag_name'] ?? null) || ($tag === null ? ($includePrereleases ? SoftwareVersion::parse($data['tag_name']) === null : !preg_match('/^v?[0-9]+\.[0-9]+\.[0-9]+$/D', $data['tag_name'])) : $data['tag_name'] !== $tag)) {
                        throw new \RuntimeException();
                    }
                    if (($data['draft'] ?? false) || ($tag === null && !$includePrereleases && ($data['prerelease'] ?? false))) {
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

    private function emptyRelease(string $repository): array
    {
        return ['tag' => null, 'notes' => '', 'url' => 'https://github.com/' . $repository . '/releases', 'error' => null];
    }

    /** @phpstan-impure */
    private function ended(\Psr\Http\Message\StreamInterface $stream): bool
    {
        return $stream->eof();
    }
}
