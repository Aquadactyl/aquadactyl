<?php

namespace Pterodactyl\Services\Settings;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class SiteBrandingService
{
    public function version(): string
    {
        return substr(hash('sha256', json_encode([config('app.name'), config('aquadactyl.branding.logo_path')], JSON_THROW_ON_ERROR)), 0, 16);
    }

    public function url(string $file): string
    {
        return '/branding/site/' . $file . '?v=' . $this->version();
    }

    public function iconUrl(int $size): string
    {
        return $this->url('icons/' . $size . '.png');
    }

    public function icon(int $size): string
    {
        return Cache::remember('site-branding:' . $this->version() . ':png:' . $size, 86400, function () use ($size) {
            $path = config('aquadactyl.branding.logo_path');
            $disk = Storage::disk('public');
            $contents = is_string($path) && preg_match('/^branding\/[a-f0-9-]+\.png$/D', $path) && $disk->exists($path)
                ? $disk->get($path) : file_get_contents(public_path('favicons/android-chrome-512x512.png'));
            $source = is_string($contents) ? @imagecreatefromstring($contents) : false;
            if (!$source) {
                $source = imagecreatefrompng(public_path('favicons/android-chrome-512x512.png'));
            }

            $width = imagesx($source);
            $height = imagesy($source);
            $scale = min($size / $width, $size / $height);
            $targetWidth = max(1, (int) round($width * $scale));
            $targetHeight = max(1, (int) round($height * $scale));
            $image = imagecreatetruecolor($size, $size);
            imagealphablending($image, false);
            imagesavealpha($image, true);
            imagefill($image, 0, 0, imagecolorallocatealpha($image, 0, 0, 0, 127));
            imagecopyresampled($image, $source, (int) (($size - $targetWidth) / 2), (int) (($size - $targetHeight) / 2), 0, 0, $targetWidth, $targetHeight, $width, $height);

            // Fit the entire logo into a square icon without stretching or cropping it.
            $stream = fopen('php://temp', 'w+b');
            try {
                imagepng($image, $stream);
                rewind($stream);

                return stream_get_contents($stream);
            } finally {
                fclose($stream);
            }
        });
    }

    public function favicon(): string
    {
        $sizes = [16, 32, 48];
        $directory = pack('vvv', 0, 1, count($sizes));
        $images = '';
        $offset = 6 + 16 * count($sizes);
        foreach ($sizes as $size) {
            $png = $this->icon($size);
            // ICO directory entries followed by PNG frames with their alpha channels.
            $directory .= pack('CCCCvvVV', $size, $size, 0, 0, 1, 32, strlen($png), $offset);
            $images .= $png;
            $offset += strlen($png);
        }

        return $directory . $images;
    }

    public function mask(): string
    {
        return Cache::remember('site-branding:' . $this->version() . ':mask', 86400, function () {
            $image = imagecreatefromstring($this->icon(256));
            $path = '';
            // Safari pinned tabs need black vectors on a transparent background.
            // Trace the alpha silhouette as horizontal runs, preserving the icon's proportions.
            for ($y = 0; $y < 256; ++$y) {
                $start = null;
                for ($x = 0; $x <= 256; ++$x) {
                    $visible = $x < 256 && ((imagecolorat($image, $x, $y) >> 24) & 0x7F) < 96;
                    if ($visible && $start === null) {
                        $start = $x;
                    } elseif (!$visible && $start !== null) {
                        $path .= 'M' . $start . ' ' . $y . 'h' . ($x - $start) . 'v1H' . $start . 'z';
                        $start = null;
                    }
                }
            }

            return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="#000" transform="scale(0.0625)" d="' . $path . '"/></svg>';
        });
    }

    public function manifest(): array
    {
        $name = config('app.name', 'Aquadactyl');

        return [
            'id' => '/',
            'name' => $name,
            'short_name' => $name,
            'start_url' => '/',
            'scope' => '/',
            'display' => 'standalone',
            'background_color' => '#11161b',
            'theme_color' => '#11161b',
            'icons' => array_map(fn ($size) => [
                'src' => $this->iconUrl($size),
                'sizes' => $size . 'x' . $size,
                'type' => 'image/png',
                'purpose' => 'any',
            ], [192, 512]),
        ];
    }

    public function browserconfig(): string
    {
        $xml = '<?xml version="1.0" encoding="utf-8"?><browserconfig><msapplication><tile>';
        foreach ([70, 150, 310] as $size) {
            $xml .= '<square' . $size . 'x' . $size . 'logo src="' . htmlspecialchars($this->iconUrl($size), ENT_XML1 | ENT_QUOTES, 'UTF-8') . '"/>';
        }

        return $xml . '<TileColor>#11161b</TileColor></tile></msapplication></browserconfig>';
    }
}
