<?php

namespace Pterodactyl\Http\Requests\Api\Client\Servers\Files;

use Pterodactyl\Models\Server;
use Pterodactyl\Models\Permission;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class TrashItemRequest extends ClientApiRequest
{
    public function authorize(): bool
    {
        $server = $this->route('server');
        if (config('aquadactyl.features.file_trash', false) !== true || !$server instanceof Server) {
            return false;
        }
        $permission = $this->isMethod('GET') ? Permission::ACTION_FILE_READ : Permission::ACTION_FILE_DELETE;

        return $this->user()->can($permission, $server)
            && (!$this->routeIs('api:client:server.trash.restore') || $this->user()->can(Permission::ACTION_FILE_CREATE, $server));
    }

    public function rules(): array
    {
        return ['page' => 'sometimes|integer|min:1|max:100000'];
    }
}
