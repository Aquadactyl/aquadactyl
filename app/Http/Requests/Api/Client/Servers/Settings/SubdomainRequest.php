<?php

namespace Pterodactyl\Http\Requests\Api\Client\Servers\Settings;

use Pterodactyl\Models\Permission;
use Pterodactyl\Contracts\Http\ClientPermissionsRequest;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class SubdomainRequest extends ClientApiRequest implements ClientPermissionsRequest
{
    public function permission(): string
    {
        return Permission::ACTION_SETTINGS_RENAME;
    }

    public function rules(): array
    {
        return $this->isMethod('POST') ? [
            'domain_id' => 'required|integer',
            'label' => ['required', 'string', 'max:63', 'regex:/\A[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\z/'],
            'minecraft_srv' => 'required|boolean',
        ] : [];
    }
}
