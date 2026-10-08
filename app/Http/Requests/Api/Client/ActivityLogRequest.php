<?php

namespace Pterodactyl\Http\Requests\Api\Client;

use Illuminate\Validation\Rule;

class ActivityLogRequest extends ClientApiRequest
{
    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'filter.event' => ['sometimes', 'nullable', 'string', 'max:255'],
            'filter.event_exact' => ['sometimes', 'nullable', 'string', 'max:255'],
            'filter.ip' => ['sometimes', 'nullable', 'ip'],
            'filter.period' => ['sometimes', Rule::in(['24h', '7d', '30d', '90d'])],
            'filter.source' => ['sometimes', Rule::in(['web', 'api', 'sftp', 'system'])],
        ];
    }
}
