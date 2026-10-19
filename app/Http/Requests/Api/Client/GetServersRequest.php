<?php

namespace Pterodactyl\Http\Requests\Api\Client;

class GetServersRequest extends ClientApiRequest
{
    public function rules(): array
    {
        return ['folder' => ['sometimes', 'string', 'regex:/^(?:unfiled|[1-9][0-9]*)$/']];
    }

    public function authorize(): bool
    {
        return true;
    }
}
