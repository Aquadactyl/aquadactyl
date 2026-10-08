<?php

namespace Pterodactyl\Services\Users;

use Illuminate\Support\Str;
use Pterodactyl\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Pterodactyl\Exceptions\DisplayException;
use Illuminate\Validation\ValidationException;

class ProfilePictureService
{
    public function upload(User $user, UploadedFile $file): User
    {
        $contents = $this->encode($file);
        $path = 'avatars/' . Str::uuid() . '.png';
        $disk = Storage::disk('public');

        if (!$disk->put($path, $contents)) {
            throw new DisplayException('The profile picture could not be saved. Please try again.');
        }

        return $this->persist($user, $path);
    }

    public function remove(User $user): User
    {
        return $this->persist($user, null);
    }

    private function persist(User $user, ?string $path): User
    {
        try {
            $previous = $user->getConnection()->transaction(function () use ($user, $path) {
                // Serialize concurrent replacements so old files can be removed safely.
                $current = User::query()->lockForUpdate()->findOrFail($user->id);
                $previous = $current->avatar;
                $current->avatar = $path;
                $current->saveOrFail();

                return $previous;
            });
        } catch (\Throwable $exception) {
            if ($path) {
                Storage::disk('public')->delete($path);
            }

            throw $exception;
        }

        if ($previous) {
            Storage::disk('public')->delete($previous);
        }

        return $user->refresh();
    }

    private function encode(UploadedFile $file): string
    {
        $source = @imagecreatefromstring(file_get_contents($file->getPathname()));
        if (!$source) {
            throw ValidationException::withMessages(['avatar' => 'Upload a valid PNG, JPEG or WebP image.']);
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $side = min($width, $height);
        $image = imagecreatetruecolor(256, 256);
        imagealphablending($image, false);
        imagesavealpha($image, true);
        imagefill($image, 0, 0, imagecolorallocatealpha($image, 0, 0, 0, 127));
        imagecopyresampled($image, $source, 0, 0, (int) (($width - $side) / 2), (int) (($height - $side) / 2), 256, 256, $side, $side);

        // Re-encode pixels to strip metadata and embedded content from uploads.
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
