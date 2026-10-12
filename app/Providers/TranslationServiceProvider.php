<?php

namespace Pterodactyl\Providers;

use Pterodactyl\Services\Translations\TranslationLoader;
use Illuminate\Translation\TranslationServiceProvider as BaseServiceProvider;

class TranslationServiceProvider extends BaseServiceProvider
{
    /**
     * Register the translation line loader.
     *
     * @return void
     */
    protected function registerLoader()
    {
        $this->app->singleton('translation.loader', function ($app) {
            return new TranslationLoader(
                $app['files'],
                [dirname((new \ReflectionClass(BaseServiceProvider::class))->getFileName()) . '/lang', $app['path.lang']]
            );
        });
    }
}
