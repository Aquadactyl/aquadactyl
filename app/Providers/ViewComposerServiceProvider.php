<?php

namespace Pterodactyl\Providers;

use Illuminate\Support\ServiceProvider;
use Pterodactyl\Http\ViewComposers\AssetComposer;

class ViewComposerServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Blade invokes the wildcard composer for every included partial.
        // Reuse its dependencies within a request, never between requests.
        $this->app->scoped(AssetComposer::class);
    }

    /**
     * Register bindings in the container.
     */
    public function boot(): void
    {
        $this->app->make('view')->composer('*', AssetComposer::class);
    }
}
