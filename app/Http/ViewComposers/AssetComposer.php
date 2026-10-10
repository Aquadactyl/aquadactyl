<?php

namespace Pterodactyl\Http\ViewComposers;

use Illuminate\View\View;
use Pterodactyl\Services\Helpers\AssetHashService;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Admin\BlueprintAdminLibrary as BlueprintExtensionLibrary;

class AssetComposer
{
    /**
     * AssetComposer constructor.
     */
    public function __construct(
        private AssetHashService $assetHashService,
        private BlueprintExtensionLibrary $blueprint,
    ) {
    }

    /**
     * Provide access to the asset service in the views.
     */
    public function compose(View $view): void
    {
        $blueprintConfiguration = $this->blueprint->dbGetMany('blueprint', [
            'flags:disable_attribution',
        ]);
        $view->with('asset', $this->assetHashService);
        $view->with('siteConfiguration', [
            'name' => config('app.name') ?? 'Aquadactyl',
            'appUrl' => config('app.url') ?? '',
            'locale' => config('app.locale') ?? 'en',
            'timezone' => config('app.timezone') ?? 'UTC',
            'logoUrl' => config('aquadactyl.branding.logo_path') ? '/storage/' . config('aquadactyl.branding.logo_path') : null,
            'showNameWithLogo' => (bool) config('aquadactyl.branding.show_name', false),
            'features' => [
                'playerCounts' => (bool) config('aquadactyl.features.player_counts', true),
                'customProfilePictures' => (bool) config('aquadactyl.features.custom_profile_pictures', true),
                'privacyMode' => (bool) config('aquadactyl.features.privacy_mode', true),
                'serverQuickActions' => (bool) config('aquadactyl.features.server_quick_actions', true),
            ],
            'recaptcha' => [
                'enabled' => config('recaptcha.enabled', false),
                'provider' => config('recaptcha.provider', 'recaptcha'),
                'siteKey' => config('recaptcha.website_key') ?? '',
            ],
            'blueprint' => [
                'disable_attribution' => (bool) $blueprintConfiguration['flags:disable_attribution'],
            ],
        ]);
    }
}
