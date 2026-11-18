<?php

namespace Pterodactyl\Http\Requests\Api\Client;

class GetServersRequest extends ClientApiRequest
{
    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'between:1,2147483647'],
            'per_page' => ['sometimes', 'integer', 'min:1'],
            'folder' => ['sometimes', 'string', 'regex:/^(?:unfiled|[1-9][0-9]*)$/'],
        ];
    }

    public function authorize(): bool
    {
        return true;
    }
}
