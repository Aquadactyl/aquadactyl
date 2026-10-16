<?php

namespace Pterodactyl\Services\Users;

use Illuminate\Http\Request;
use Illuminate\Filesystem\Filesystem;
use Symfony\Component\HttpFoundation\AcceptHeader;

class LanguageService
{
    public const AUTOMATIC = 'auto';

    public const CODE_PATTERN = '[a-z]{2,3}(?:[-_][A-Za-z0-9]{2,8}){0,3}';

    private ?array $languages = null;

    private string $defaultLocale;

    private string $fallbackLocale;

    public function __construct(private Filesystem $files)
    {
        // Application::setLocale also changes app.locale. Remember the site
        // defaults before applying a viewer's preference to this request.
        $this->defaultLocale = config('app.locale', 'en');
        $this->fallbackLocale = config('app.fallback_locale', 'en');
    }

    /**
     * Discover trusted, locally installed language packs. Metadata is optional
     * so existing Pterodactyl language directories continue to work.
     *
     * @return array<string, array{name: string, nativeName: string, direction: string}>
     */
    public function available(): array
    {
        if ($this->languages !== null) {
            return $this->languages;
        }

        $languages = [];
        foreach ($this->files->directories(resource_path('lang')) as $directory) {
            $code = basename($directory);
            if ($code === self::AUTOMATIC || !preg_match('/^' . self::CODE_PATTERN . '$/D', $code) || strlen($code) > 35) {
                continue;
            }

            $metadataPath = $directory . '/locale.json';
            $metadata = $this->files->exists($metadataPath)
                ? json_decode($this->files->get($metadataPath), true)
                : [];
            $metadata = is_array($metadata) ? $metadata : [];
            $base = preg_split('/[-_]/', $code)[0];
            $name = \Locale::getDisplayLanguage($base, 'en') ?: $code;
            $nativeName = \Locale::getDisplayLanguage($base, $base) ?: $name;

            $languages[$code] = [
                'name' => $this->label($metadata['name'] ?? null, mb_ucfirst($name)),
                'nativeName' => $this->label($metadata['nativeName'] ?? null, mb_ucfirst($nativeName)),
                'direction' => ($metadata['direction'] ?? 'ltr') === 'rtl' ? 'rtl' : 'ltr',
            ];
        }

        ksort($languages);

        return $this->languages = $languages;
    }

    public function fallback(): string
    {
        $languages = $this->available();
        foreach ([$this->defaultLocale, $this->fallbackLocale, 'en'] as $locale) {
            if (isset($languages[$locale])) {
                return $locale;
            }
        }

        return array_key_first($languages) ?? 'en';
    }

    public function revision(): string
    {
        $files = [];
        foreach ($this->files->allFiles(resource_path('lang')) as $file) {
            $files[] = $file->getRelativePathname() . ':' . $file->getMTime() . ':' . $file->getSize();
        }
        sort($files);

        return substr(hash('sha256', implode('|', $files)), 0, 16);
    }

    /**
     * Core labels are available before React mounts. Addon namespaces still
     * load on demand through the locale endpoint.
     */
    public function initialResources(): array
    {
        $resources = [];
        $loader = app('translator')->getLoader();
        foreach (array_unique([app()->getLocale(), $this->fallbackLocale, 'en']) as $locale) {
            if (isset($this->available()[$locale])) {
                $resources[$locale]['panel'] = self::forFrontend($loader->load($locale, 'panel'));
            }
        }

        return $resources;
    }

    public static function forFrontend(array $data): array
    {
        foreach ($data as $key => $value) {
            $data[$key] = is_array($value)
                ? self::forFrontend($value)
                : preg_replace('/:([\w.-]+\w)([^\w:]?|$)/m', '{{$1}}$2', $value);
        }

        return $data;
    }

    public function forRequest(Request $request, ?string $preference): string
    {
        $preferred = [];
        foreach (AcceptHeader::fromString($request->header('Accept-Language', ''))->all() as $item) {
            if ($item->getQuality() > 0) {
                $preferred[] = $item->getValue();
            }
        }

        return $this->resolve($preference, $preferred);
    }

    /**
     * An explicit account preference always wins. Automatic preferences follow
     * Accept-Language order, with regional tags falling back to their base.
     */
    public function resolve(?string $preference, array $preferredLanguages = []): string
    {
        $languages = $this->available();
        if ($preference !== null && $preference !== self::AUTOMATIC) {
            return isset($languages[$preference]) ? $preference : $this->fallback();
        }

        $normalized = [];
        foreach (array_keys($languages) as $code) {
            $normalized[strtolower(str_replace('_', '-', $code))] = $code;
        }

        foreach ($preferredLanguages as $language) {
            $tag = strtolower(str_replace('_', '-', $language));
            do {
                if (isset($normalized[$tag])) {
                    return $normalized[$tag];
                }
                $separator = strrpos($tag, '-');
                $tag = $separator === false ? '' : substr($tag, 0, $separator);
            } while ($tag !== '');

            // A generic preference (e.g. "pt") can also use an installed
            // regional pack (e.g. "pt-BR") when no base pack is available.
            $base = explode('-', strtolower(str_replace('_', '-', $language)))[0];
            foreach ($normalized as $candidate => $code) {
                if (str_starts_with($candidate, $base . '-')) {
                    return $code;
                }
            }
        }

        return $this->fallback();
    }

    private function label(mixed $value, string $fallback): string
    {
        return is_string($value) && trim($value) !== '' ? mb_substr(trim($value), 0, 100) : $fallback;
    }
}
