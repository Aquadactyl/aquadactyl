<?php

namespace Pterodactyl\Http\Requests\Api\Client\Account;

use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class UpdateAvatarRequest extends ClientApiRequest
{
    public function authorize(): bool
    {
        return config('aquadactyl.features.custom_profile_pictures', true) && parent::authorize();
    }

    public function rules(): array
    {
        return [
            'avatar' => ['bail', 'required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:min_width=1,min_height=1,max_width=4096,max_height=4096'],
        ];
    }
}
