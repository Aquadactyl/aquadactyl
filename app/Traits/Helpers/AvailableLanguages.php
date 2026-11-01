<?php

namespace Pterodactyl\Traits\Helpers;

use Pterodactyl\Services\Users\LanguageService;

trait AvailableLanguages
{
    public function getAvailableLanguages(bool $localize = false): array
    {
        return array_map(
            fn (array $language) => $language[$localize ? 'nativeName' : 'name'],
            app(LanguageService::class)->available()
        );
    }
}
