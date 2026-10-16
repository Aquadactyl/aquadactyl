<?php

namespace Pterodactyl\Http\Controllers\Base;

use Illuminate\Http\JsonResponse;
use Illuminate\Translation\Translator;
use Illuminate\Contracts\Translation\Loader;
use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Services\Users\LanguageService;
use Pterodactyl\Http\Requests\Base\LocaleRequest;

class LocaleController extends Controller
{
    protected Loader $loader;

    public function __construct(Translator $translator)
    {
        $this->loader = $translator->getLoader();
    }

    /**
     * Returns translation data given a specific locale and namespace.
     */
    public function __invoke(LocaleRequest $request): JsonResponse
    {
        $locales = array_unique(preg_split('/[+ ]/', $request->input('locale')));
        $namespaces = array_unique(preg_split('/[+ ]/', $request->input('namespace')));
        $response = [];
        foreach ($locales as $locale) {
            foreach ($namespaces as $namespace) {
                $response[$locale][$namespace] = $this->i18n($this->loader->load($locale, $namespace));
            }
        }

        return new JsonResponse($response, 200, [
            // Cache this in the browser for an hour, and allow the browser to use a stale
            // cache for up to a day after it was created while it fetches an updated set
            // of translation keys.
            'Cache-Control' => 'public, max-age=3600, stale-while-revalidate=86400',
            'ETag' => md5(json_encode($response, JSON_THROW_ON_ERROR)),
        ]);
    }

    /**
     * Convert standard Laravel translation keys that look like ":foo"
     * into key structures that are supported by the front-end i18n
     * library, like "{{foo}}".
     */
    protected function i18n(array $data): array
    {
        return LanguageService::forFrontend($data);
    }
}
