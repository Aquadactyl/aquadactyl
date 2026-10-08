<?php

namespace Pterodactyl\Http\Requests\Api\Client\Account;

use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class UpdatePrivacyRequest extends ClientApiRequest
{
    public function authorize(): bool
    {
        return config('aquadactyl.features.privacy_mode', true) && parent::authorize();
    }

    public function rules(): array
    {
        return ['blur_sensitive_data' => ['required', 'boolean']];
    }
}
