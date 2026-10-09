<?php

namespace Pterodactyl\Services\Eggs;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Psr\Http\Message\ResponseInterface;
use Illuminate\Support\Facades\Validator;
use Pterodactyl\Exceptions\DisplayException;
use Illuminate\Http\Client\ConnectionException;

class EggDownloadService
{
    public const SOURCES = ['pterodactyl', 'pelican', 'community'];

    private const BASE_URL = 'https://eggs.download/api/eggs';
    private const MAX_BYTES = 2 * 1024 * 1024;

    public function catalog(): array
    {
        return Cache::remember('egg-download:catalog:v1', 600, function () {
            $data = $this->fetch(self::BASE_URL);
            if (!array_is_list($data)) {
                throw new DisplayException('eggs.download returned an invalid catalog. Please try again later.');
            }

            return collect($data)->filter(fn ($egg) => is_array($egg)
                && $this->validSlug($egg['slug'] ?? null)
                && is_string($egg['name'] ?? null)
                && in_array($egg['source'] ?? null, self::SOURCES, true)
                && is_string($egg['category'] ?? null)
                && is_string($egg['repo'] ?? null))
                ->map(fn ($egg) => array_intersect_key($egg, array_flip(['slug', 'name', 'source', 'category', 'repo'])))
                ->unique('slug')->values()->all();
        });
    }

    public function detail(string $slug): array
    {
        if (!$this->validSlug($slug)) {
            throw new DisplayException('The selected egg identifier is invalid.');
        }

        return Cache::remember('egg-download:detail:v1:' . $slug, 300, function () use ($slug) {
            $data = $this->fetch(self::BASE_URL . '/' . rawurlencode($slug));
            if (!is_array($data['egg'] ?? null) || !is_array($data['meta'] ?? null)
                || ($data['meta']['slug'] ?? null) !== $slug || !is_string($data['egg']['name'] ?? null)) {
                throw new DisplayException('eggs.download returned an invalid egg file. Please try again later.');
            }
            if (Validator::make($data['egg'], [
                'name' => 'required|string|max:191',
                'author' => 'required|string|email',
                'description' => 'nullable|string',
                'meta' => 'required|array',
                'meta.version' => 'required|string',
                'startup' => 'nullable|string',
                'docker_images' => 'nullable|array',
                'docker_images.*' => 'string',
                'scripts' => 'nullable|array',
                'scripts.installation' => 'nullable|array',
                'scripts.installation.script' => 'nullable|string',
                'variables' => 'nullable|array',
                'variables.*' => 'array',
            ])->fails()) {
                throw new DisplayException('eggs.download returned a malformed egg file. Choose another egg or try again later.');
            }
            $metadata = ['slug' => $slug];
            foreach (['source', 'category', 'owner', 'repo'] as $key) {
                $metadata[$key] = is_string($data['meta'][$key] ?? null) ? $data['meta'][$key] : '';
            }

            return ['egg' => $data['egg'], 'meta' => $metadata, 'readme' => is_string($data['readme'] ?? null) ? $data['readme'] : ''];
        });
    }

    public function encode(array $egg): string
    {
        return json_encode($egg, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
    }

    public function compatible(array $egg): bool
    {
        return in_array($egg['meta']['version'] ?? null, ['PTDL_v1', 'PTDL_v2'], true);
    }

    private function validSlug(mixed $slug): bool
    {
        return is_string($slug) && strlen($slug) <= 150 && preg_match('/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/', $slug) === 1;
    }

    private function fetch(string $url): array
    {
        try {
            $response = Http::acceptJson()->withUserAgent('Aquadactyl Egg Library (https://github.com/Aquadactyl/aquadactyl)')
                ->connectTimeout(5)->timeout(15)->withOptions([
                    'allow_redirects' => false,
                    'on_headers' => static function (ResponseInterface $response) {
                        if ((int) $response->getHeaderLine('Content-Length') > self::MAX_BYTES) {
                            throw new \RuntimeException('Egg response exceeded the size limit.');
                        }
                    },
                    'progress' => static function ($total, $downloaded) {
                        if ($downloaded > self::MAX_BYTES) {
                            throw new \RuntimeException('Egg response exceeded the size limit.');
                        }
                    },
                ])->get($url);
        } catch (ConnectionException|\RuntimeException $exception) {
            throw new DisplayException('Could not reach eggs.download. Please try again in a moment.', $exception);
        }

        if ($response->status() === 429) {
            throw new DisplayException('eggs.download is limiting requests. Please wait a few minutes and try again.');
        }
        if ($response->status() === 404) {
            throw new DisplayException('This egg is no longer available on eggs.download. Choose another egg from the library.');
        }
        if (!$response->successful()) {
            throw new DisplayException('eggs.download is temporarily unavailable. Please try again later.');
        }
        if (strlen($response->body()) > self::MAX_BYTES) {
            throw new DisplayException('The eggs.download response is too large to import.');
        }

        try {
            $data = json_decode($response->body(), true, 128, JSON_THROW_ON_ERROR);
        } catch (\JsonException $exception) {
            throw new DisplayException('eggs.download returned an unreadable response. Please try again later.', $exception);
        }
        if (!is_array($data)) {
            throw new DisplayException('eggs.download returned an invalid response. Please try again later.');
        }

        return $data;
    }
}
