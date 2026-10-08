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
            'app:name' => 'required|string|max:191',
            'aquadactyl:branding:show_name' => 'sometimes|required|in:true,false',
            'aquadactyl:features:player_counts' => 'sometimes|required|in:true,false',
            'aquadactyl:features:custom_profile_pictures' => 'sometimes|required|in:true,false',
            'aquadactyl:features:privacy_mode' => 'sometimes|required|in:true,false',
            'aquadactyl:features:server_quick_actions' => 'sometimes|required|in:true,false',
            'pterodactyl:auth:2fa_required' => 'required|integer|in:0,1,2',
            'app:locale' => ['required', 'string', Rule::in(array_keys($this->getAvailableLanguages()))],
        ];
    }

    public function attributes(): array
    {
        return [
            'app:name' => 'Site Name',
            'aquadactyl:branding:show_name' => 'Show Site Name Beside Logo',
            'aquadactyl:features:player_counts' => 'Player Counts',
            'aquadactyl:features:custom_profile_pictures' => 'Custom Profile Pictures',
            'aquadactyl:features:privacy_mode' => 'Sensitive Data Blur',
            'aquadactyl:features:server_quick_actions' => 'Server Quick Actions',
            'pterodactyl:auth:2fa_required' => 'Require 2-Factor Authentication',
            'app:locale' => 'Default Language',
        ];
    }
}
