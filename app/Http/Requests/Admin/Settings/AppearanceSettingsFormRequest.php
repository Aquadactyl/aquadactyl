<?php

namespace Pterodactyl\Http\Requests\Admin\Settings;

use Illuminate\Validation\Rule;
use Pterodactyl\Services\Settings\AppearanceService;
use Pterodactyl\Http\Requests\Admin\AdminFormRequest;

class AppearanceSettingsFormRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return [
            'app:name' => ['sometimes', 'required', 'string', 'max:191'],
            'aquadactyl:branding:show_name' => ['sometimes', 'required', 'in:true,false'],
            'primary_color' => ['required', 'string', 'regex:/\A#[a-f0-9]{6}\z/i'],
            'login_layout' => ['required', Rule::in(AppearanceService::LAYOUTS)],
            'login_logo_position' => ['required', Rule::in(AppearanceService::LOGO_POSITIONS)],
            'login_translucency' => ['required', 'integer', 'between:0,100'],
            'login_blur' => ['required', 'integer', 'between:0,30'],
            'login_overlay' => ['required', 'integer', 'between:0,95'],
            'client_blur' => ['required', 'integer', 'between:0,30'],
            'client_overlay' => ['required', 'integer', 'between:0,95'],
        ];
    }

    public function attributes(): array
    {
        return [
            'app:name' => __('admin/ui.site_name'),
            'aquadactyl:branding:show_name' => __('admin/ui.show_site_name_beside_logo'),
            'primary_color' => __('admin/custom.primary_color'),
            'login_layout' => __('admin/custom.login_layout'),
            'login_logo_position' => __('admin/custom.logo_position'),
            'login_translucency' => __('admin/custom.login_translucency'),
            'login_blur' => __('admin/custom.login_background') . ' ' . __('admin/custom.blur'),
            'login_overlay' => __('admin/custom.login_background') . ' ' . __('admin/custom.overlay'),
            'client_blur' => __('admin/custom.client_background') . ' ' . __('admin/custom.blur'),
            'client_overlay' => __('admin/custom.client_background') . ' ' . __('admin/custom.overlay'),
        ];
    }
}
