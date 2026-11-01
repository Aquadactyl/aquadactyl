<?php

namespace Pterodactyl\Http\Requests\Api\Client\Servers;

use Pterodactyl\Models\Permission;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class ShareConsoleLogsRequest extends ClientApiRequest
{
    public const MAX_BYTES = 131072;

    public function permission(): string
    {
        return Permission::ACTION_WEBSOCKET_CONNECT;
    }

    public function authorize(): bool
    {
        return config('aquadactyl.features.console_log_sharing', false) === true && parent::authorize();
    }

    public function rules(): array
    {
        return ['content' => ['bail', 'required', 'string', 'max:' . self::MAX_BYTES, function ($attribute, $value, $fail) {
            if (strlen($value) > self::MAX_BYTES) {
                $fail('Console logs must not exceed 128 KiB.');
            }
        }]];
    }
}
