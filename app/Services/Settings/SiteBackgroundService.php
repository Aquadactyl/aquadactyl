<?php

namespace Pterodactyl\Services\Settings;

use Illuminate\Support\Str;
use Pterodactyl\Models\Setting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Pterodactyl\Exceptions\DisplayException;
use Illuminate\Validation\ValidationException;
use Pterodactyl\Contracts\Repository\SettingsRepositoryInterface;

class SiteBackgroundService
{
    public function __construct(private SettingsRepositoryInterface $settings)
    {
    }

    public function upload(string $area, UploadedFile $file): void
    {
        abort_unless(in_array($area, ['login', 'client'], true), 404);
        $source = @imagecreatefromstring(file_get_contents($file->getPathname()));
        if (!$source) {
            throw ValidationException::withMessages(['background' => __('admin/custom.background_invalid')]);
        }
        $scale = min(1, 2560 / imagesx($source), 1440 / imagesy($source));
        $width = max(1, (int) round(imagesx($source) * $scale));
        $height = max(1, (int) round(imagesy($source) * $scale));
        $image = imagecreatetruecolor($width, $height);
        imagealphablending($image, false);
        imagesavealpha($image, true);
        imagefill($image, 0, 0, imagecolorallocatealpha($image, 0, 0, 0, 127));
        imagecopyresampled($image, $source, 0, 0, 0, 0, $width, $height, imagesx($source), imagesy($source));
        $stream = fopen('php://temp', 'w+b');
        try {
            imagepng($image, $stream, 7);
            rewind($stream);
            $contents = stream_get_contents($stream);
        } finally {
            fclose($stream);
        }
        $path = 'backgrounds/' . $area . '/' . Str::uuid() . '.png';
        if (!Storage::disk('public')->put($path, $contents)) {
            throw new DisplayException(__('admin/custom.background_save_failed'));
        }
        $this->persist($area, $path);
    }

    public function remove(string $area): void
    {
        abort_unless(in_array($area, ['login', 'client'], true), 404);
        $this->persist($area, null);
    }

    private function persist(string $area, ?string $path): void
    {
        $key = 'settings::aquadactyl:appearance:' . $area . '_background_path';
        try {
            $previous = (new Setting())->getConnection()->transaction(function () use ($key, $path) {
                Setting::query()->firstOrCreate(['key' => $key], ['value' => '']);
                $setting = Setting::query()->where('key', $key)->lockForUpdate()->firstOrFail();
                $previous = $setting->value;
                $this->settings->set($key, $path);

                return $previous;
            });
        } catch (\Throwable $exception) {
            if ($path) {
                Storage::disk('public')->delete($path);
            }
            throw $exception;
        }
        if ($previous && str_starts_with($previous, 'backgrounds/' . $area . '/')) {
            Storage::disk('public')->delete($previous);
        }
    }
}
