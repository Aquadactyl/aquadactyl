<?php

namespace Pterodactyl\Http\Requests\Admin\Settings;

use Pterodactyl\Http\Requests\Admin\AdminFormRequest;

class UpdateLogoRequest extends AdminFormRequest
{
    public function rules(): array
    {
        return [
            'logo' => ['bail', 'required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:min_width=1,min_height=1,max_width=4096,max_height=4096'],
        ];
    }
}
