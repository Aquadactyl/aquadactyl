<?php

namespace Pterodactyl\Http\Requests\Admin\Settings;

use Illuminate\Validation\Rule;
use Pterodactyl\Traits\Helpers\AvailableLanguages;
use Pterodactyl\Http\Requests\Admin\AdminFormRequest;

class BaseSettingsFormRequest extends AdminFormRequest
{
    use AvailableLanguages;

    public function rules(): array
    {
        return [
            'aquadactyl:maintenance:enabled' => 'sometimes|required|in:true,false',
            'aquadactyl:maintenance:message' => 'sometimes|nullable|string|max:1000',
            'app:name' => 'sometimes|required|string|max:191',
            'aquadactyl:branding:show_name' => 'sometimes|required|in:true,false',
            'aquadactyl:features:player_counts' => 'sometimes|required|in:true,false',
            'aquadactyl:features:custom_profile_pictures' => 'sometimes|required|in:true,false',
            'aquadactyl:features:privacy_mode' => 'sometimes|required|in:true,false',
            'aquadactyl:features:server_quick_actions' => 'sometimes|required|in:true,false',
            'aquadactyl:features:server_folders' => 'sometimes|required|in:true,false',
            'aquadactyl:features:registration' => 'sometimes|required|in:true,false',
            'aquadactyl:features:console_log_sharing' => 'sometimes|required|in:true,false',
            'aquadactyl:features:file_trash' => 'sometimes|required|in:true,false',
            'aquadactyl:trash:retention_days' => 'sometimes|required|integer|min:1|max:365',
            'pterodactyl:auth:2fa_required' => 'required|integer|in:0,1,2',
            'app:locale' => ['required', 'string', Rule::in(array_keys($this->getAvailableLanguages()))],
        ];
    }

    public function attributes(): array
    {
        return [
            'app:name' => __('admin/ui.site_name'),
            'aquadactyl:branding:show_name' => __('admin/ui.show_site_name_beside_logo'),
            'aquadactyl:features:player_counts' => __('admin/ui.feature_player_counts'),
            'aquadactyl:features:custom_profile_pictures' => __('admin/ui.feature_custom_profile_pictures'),
            'aquadactyl:features:privacy_mode' => __('admin/ui.feature_privacy_mode'),
            'aquadactyl:features:server_quick_actions' => __('admin/ui.feature_server_quick_actions'),
            'aquadactyl:features:server_folders' => __('admin/custom.server_folders'),
            'aquadactyl:features:registration' => __('admin/ui.feature_registration'),
            'aquadactyl:features:console_log_sharing' => __('admin/custom.console_log_sharing'),
            'aquadactyl:features:file_trash' => __('admin/custom.file_trash'),
            'aquadactyl:trash:retention_days' => __('admin/custom.trash_retention'),
            'pterodactyl:auth:2fa_required' => __('admin/ui.require_2_factor_authentication'),
            'app:locale' => __('admin/ui.default_language'),
        ];
    }
}
