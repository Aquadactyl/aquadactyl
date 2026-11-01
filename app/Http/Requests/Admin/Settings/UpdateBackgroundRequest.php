<?php

namespace Pterodactyl\Http\Requests\Admin\Settings;

use Pterodactyl\Http\Requests\Admin\AdminFormRequest;

class UpdateBackgroundRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return ['background' => ['bail', 'required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192', 'dimensions:min_width=1,min_height=1,max_width=4096,max_height=4096']];
    }

    public function attributes(): array
    {
        return ['background' => __('admin/custom.background_image')];
    }
}
