<?php

// Run with PHP's GD extension after replacing the source PNGs in resources/branding.
$root = dirname(__DIR__, 2);
$source = $root . '/resources/branding/';
$public = $root . '/public/';

function trimLogo(string $path): GdImage
{
    $image = imagecreatefrompng($path);
    $left = imagesx($image);
    $top = imagesy($image);
    $right = $bottom = -1;

    for ($y = 0; $y < imagesy($image); ++$y) {
        for ($x = 0; $x < imagesx($image); ++$x) {
            if (((imagecolorat($image, $x, $y) >> 24) & 0x7F) < 127) {
                $left = min($left, $x);
                $top = min($top, $y);
                $right = max($right, $x);
                $bottom = max($bottom, $y);
            }
        }
    }

    if ($right < $left) {
        throw new RuntimeException('Logo has no visible pixels: ' . $path);
    }

    $cropped = imagecrop($image, ['x' => $left, 'y' => $top, 'width' => $right - $left + 1, 'height' => $bottom - $top + 1]);
    imagesavealpha($cropped, true);

    return $cropped;
}

function renderIcon(GdImage $emblem, int $size, bool $opaque = false): GdImage
{
    $image = imagecreatetruecolor($size, $size);
    imagealphablending($image, false);
    imagesavealpha($image, true);
    imagefill($image, 0, 0, imagecolorallocatealpha($image, 30, 31, 34, $opaque ? 0 : 127));
    imagealphablending($image, $opaque);

    // Keep the emblem's aspect ratio and a small margin inside the square icon.
    $scale = $size * 0.92 / max(imagesx($emblem), imagesy($emblem));
    $width = max(1, (int) round(imagesx($emblem) * $scale));
    $height = max(1, (int) round(imagesy($emblem) * $scale));
    imagecopyresampled($image, $emblem, (int) (($size - $width) / 2), (int) (($size - $height) / 2), 0, 0, $width, $height, imagesx($emblem), imagesy($emblem));

    return $image;
}

$emblem = trimLogo($source . 'aquadactyl-emblem.png');
$wordmark = trimLogo($source . 'aquadactyl-wordmark.png');
imagepng($emblem, $public . 'branding/aquadactyl-emblem.png', 9);
imagepng($wordmark, $public . 'branding/aquadactyl-wordmark.png', 9);

foreach (glob($public . 'favicons/*.png') as $path) {
    [$size] = getimagesize($path);
    $icon = renderIcon($emblem, $size, str_starts_with(basename($path), 'apple-'));
    imagepng($icon, $path, 9);
}

// ICO supports PNG frames, including a 256px frame for high-density displays.
$frames = [];
foreach ([16, 24, 32, 48, 64, 128, 256] as $size) {
    $icon = renderIcon($emblem, $size);
    ob_start();
    imagepng($icon, null, 9);
    $frames[$size] = ob_get_clean();
}
$directory = pack('vvv', 0, 1, count($frames));
$offset = 6 + 16 * count($frames);
foreach ($frames as $size => $data) {
    $directory .= pack('CCCCvvVV', $size === 256 ? 0 : $size, $size === 256 ? 0 : $size, 0, 0, 1, 32, strlen($data), $offset);
    $offset += strlen($data);
}
file_put_contents($public . 'favicons/favicon.ico', $directory . implode('', $frames));

echo "Generated Aquadactyl wordmark, emblem, PNG icons and multi-size favicon.\n";
