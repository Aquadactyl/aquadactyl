<?php

namespace Pterodactyl\Http\Requests\Api\Client;

class ServerFolderRequest extends ClientApiRequest
{
    public function authorize(): bool
    {
        return config('aquadactyl.features.server_folders', true) === true;
    }
}
