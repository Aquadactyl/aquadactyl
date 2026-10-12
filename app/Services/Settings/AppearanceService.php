<?php

namespace Pterodactyl\Services\Settings;

class AppearanceService
{
    public const LAYOUTS = ['center', 'split-left', 'split-right'];
    public const LOGO_POSITIONS = ['above', 'inside', 'opposite'];
    public const DEFAULT_COLOR = '#237c7f';

    public function publicSettings(): array
    {
        $values = config('aquadactyl.appearance', []);
        $background = fn (string $area) => [
            'url' => $this->backgroundUrl($values[$area . '_background_path'] ?? null, $area),
            'blur' => max(0, min(30, (int) ($values[$area . '_blur'] ?? 0))),
            'overlay' => max(0, min(95, (int) ($values[$area . '_overlay'] ?? ($area === 'login' ? 50 : 70)))),
        ];

        return [
            'primaryColor' => $this->primaryColor(),
            'loginLayout' => in_array($values['login_layout'] ?? '', self::LAYOUTS, true) ? $values['login_layout'] : 'center',
            'loginLogoPosition' => in_array($values['login_logo_position'] ?? '', self::LOGO_POSITIONS, true) ? $values['login_logo_position'] : 'above',
            'loginBackground' => $background('login'),
            'clientBackground' => $background('client'),
        ];
    }

    public function primaryColor(): string
    {
        $color = config('aquadactyl.appearance.primary_color', self::DEFAULT_COLOR);

        return is_string($color) && preg_match('/\A#[a-f0-9]{6}\z/i', $color) ? strtolower($color) : self::DEFAULT_COLOR;
    }

    public function backgroundUrl(?string $path, string $area): ?string
    {
        return $path && preg_match('/\Abackgrounds\/' . preg_quote($area, '/') . '\/[a-f0-9-]{36}\.png\z/', $path) ? '/storage/' . $path : null;
    }

    public function cssVariables(): array
    {
        $color = $this->primaryColor();
        $palette = [];
        foreach ([50 => .96, 100 => .88, 200 => .72, 300 => .54, 400 => .28, 500 => 0, 600 => -.14, 700 => -.30, 800 => -.46, 900 => -.62, 950 => -.78] as $shade => $amount) {
            $palette[$shade] = $this->mix($color, $amount);
        }
        if ($color === self::DEFAULT_COLOR) {
            $palette = [50 => '#effcfa', 100 => '#d2f1ed', 200 => '#a4e3dc', 300 => '#78d4cc', 400 => '#55c0b7', 500 => '#237c7f', 600 => '#20696d', 700 => '#1d5558', 800 => '#204448', 900 => '#1d363a', 950 => '#122528'];
        }
        // Keep primary button text readable on both the base and hover colour.
        // Mid-tone colours use a lighter hover shade when darkening would make
        // black text lose contrast.
        $light = $this->luminance($color) > .179;
        if ($light && $this->luminance($palette[600]) < .175) {
            $palette[600] = $this->mix($color, .10);
        }
        $variables = [];
        foreach (['primary', 'blue', 'cyan'] as $family) {
            foreach ($palette as $shade => $value) {
                $variables['--color-' . $family . '-' . $shade] = $value;
            }
        }
        $contrast = $light ? '#000000' : '#ffffff';
        $variables += [
            '--color-primary-contrast' => $contrast,
            '--aqua-primary' => $color,
            '--aqua-primary-hover' => $palette[600],
            '--aqua-on-primary' => $contrast,
            '--aqua-accent' => $palette[300],
            '--aqua-accent-hover' => $palette[200],
            '--aqua-focus' => $palette[400] . '47',
            '--panel-accent' => $palette[300],
            '--panel-accent-hover' => $palette[200],
            '--panel-accent-soft' => $palette[500] . '2e',
            '--panel-accent-border' => $palette[300] . '66',
            '--panel-focus' => $palette[400] . '47',
        ];

        return $variables;
    }

    private function mix(string $color, float $amount): string
    {
        $target = $amount >= 0 ? 255 : 0;
        $channels = array_map(fn ($offset) => (int) round(hexdec(substr($color, $offset, 2)) * (1 - abs($amount)) + $target * abs($amount)), [1, 3, 5]);

        return sprintf('#%02x%02x%02x', ...$channels);
    }

    private function luminance(string $color): float
    {
        $channels = array_map(function ($offset) use ($color) {
            $channel = hexdec(substr($color, $offset, 2)) / 255;

            return $channel <= .04045 ? $channel / 12.92 : (($channel + .055) / 1.055) ** 2.4;
        }, [1, 3, 5]);

        return .2126 * $channels[0] + .7152 * $channels[1] + .0722 * $channels[2];
    }
}
