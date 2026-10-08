<?php

namespace Pterodactyl\Services\Settings;

use Illuminate\Support\Str;
use Pterodactyl\Models\Setting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Pterodactyl\Exceptions\DisplayException;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

class SiteLogoService
{
    public const SETTING = 'settings::aquadactyl:branding:logo_path';

    public function __construct(private SettingsRepositoryInterface $settings)
    {
    }

    public function upload(UploadedFile $file): void
    {
        $contents = $this->encode($file);
        $path = 'branding/' . Str::uuid() . '.png';
        if (!Storage::disk('public')->put($path, $contents)) {
            throw new DisplayException('The site logo could not be saved. Please try again.');
        }

        $this->persist($path);
    }

    public function remove(): void
    {
        $this->persist(null);
    }

    private function persist(?string $path): void
    {
        try {
            $previous = (new Setting())->getConnection()->transaction(function () use ($path) {
                Setting::query()->firstOrCreate(['key' => self::SETTING], ['value' => '']);
                $setting = Setting::query()->where('key', self::SETTING)->lockForUpdate()->firstOrFail();
                $previous = $setting->value;
                $this->settings->set(self::SETTING, $path);

                return $previous;
            });
        } catch (\Throwable $exception) {
            if ($path) {
                Storage::disk('public')->delete($path);
            }

            throw $exception;
        }

        if ($previous && str_starts_with($previous, 'branding/')) {
            Storage::disk('public')->delete($previous);
        }
    }

    private function encode(UploadedFile $file): string
    {
        $source = @imagecreatefromstring(file_get_contents($file->getPathname()));
        if (!$source) {
            throw ValidationException::withMessages(['logo' => 'Upload a valid PNG, JPEG or WebP image.']);
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $scale = min(1, 1200 / $width, 600 / $height);
        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));
        $image = imagecreatetruecolor($targetWidth, $targetHeight);
        imagealphablending($image, false);
        imagesavealpha($image, true);
        imagefill($image, 0, 0, imagecolorallocatealpha($image, 0, 0, 0, 127));
        imagecopyresampled($image, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        // Preserve the logo's proportions and transparency while stripping uploaded metadata.
        $stream = fopen('php://temp', 'w+b');
        try {
            imagepng($image, $stream);
            rewind($stream);

            return stream_get_contents($stream);
        } finally {
            fclose($stream);
        }
    }
}
