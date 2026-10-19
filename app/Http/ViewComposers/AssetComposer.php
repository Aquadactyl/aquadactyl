<?php

namespace Pterodactyl\Http\ViewComposers;

use Illuminate\View\View;
use Illuminate\Http\Request;
use Pterodactyl\Services\Helpers\AssetHashService;
use Pterodactyl\BlueprintFramework\Libraries\ExtensionLibrary\Admin\BlueprintAdminLibrary as BlueprintExtensionLibrary;

class AssetComposer
{
    private ?array $siteConfiguration = null;
    private ?Request $configurationRequest = null;

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
        $request = request();
        if ($this->configurationRequest !== $request) {
            $this->configurationRequest = $request;
            $this->siteConfiguration = $this->configuration();
        }
        $view->with('asset', $this->assetHashService);
        $view->with('siteConfiguration', $this->siteConfiguration);
    }

    private function configuration(): array
    {
        $blueprintConfiguration = $this->blueprint->dbGetMany('blueprint', [
            'flags:disable_attribution',
        ]);

        return [
            'name' => config('app.name') ?? 'Aquadactyl',
            'appUrl' => config('app.url') ?? '',
            'locale' => config('app.locale') ?? 'en',
            'timezone' => config('app.timezone') ?? 'UTC',
            'logoUrl' => config('aquadactyl.branding.logo_path') ? '/storage/' . config('aquadactyl.branding.logo_path') : null,
            'showNameWithLogo' => (bool) config('aquadactyl.branding.show_name', false),
            'appearance' => app(\Pterodactyl\Services\Settings\AppearanceService::class)->publicSettings(),
            'features' => [
                'playerCounts' => (bool) config('aquadactyl.features.player_counts', true),
                'customProfilePictures' => (bool) config('aquadactyl.features.custom_profile_pictures', true),
                'privacyMode' => (bool) config('aquadactyl.features.privacy_mode', true),
                'serverQuickActions' => (bool) config('aquadactyl.features.server_quick_actions', true),
                'serverFolders' => (bool) config('aquadactyl.features.server_folders', true),
                'registration' => (bool) config('aquadactyl.features.registration', false),
                'consoleLogSharing' => (bool) config('aquadactyl.features.console_log_sharing', false),
                'fileTrash' => (bool) config('aquadactyl.features.file_trash', false),
            ],
            'trash' => ['retentionDays' => (int) config('aquadactyl.trash.retention_days', 7)],
            'recaptcha' => [
                'enabled' => config('recaptcha.enabled', false),
                'provider' => config('recaptcha.provider', 'recaptcha'),
                'siteKey' => config('recaptcha.website_key') ?? '',
            ],
            'blueprint' => [
                'disable_attribution' => (bool) $blueprintConfiguration['flags:disable_attribution'],
            ],
        ];
    }
}
