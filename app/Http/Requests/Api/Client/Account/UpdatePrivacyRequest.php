<?php

namespace Pterodactyl\Http\Requests\Api\Client\Account;

use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class UpdatePrivacyRequest extends ClientApiRequest
{
    public function rules(): array
    {
        return ['blur_sensitive_data' => ['required', 'boolean']];
    }
}
