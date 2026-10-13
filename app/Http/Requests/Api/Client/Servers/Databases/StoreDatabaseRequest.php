<?php

namespace Pterodactyl\Http\Requests\Api\Client\Servers\Databases;

use Webmozart\Assert\Assert;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Database;
use Pterodactyl\Models\Permission;
use Pterodactyl\Contracts\Http\ClientPermissionsRequest;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;
use Pterodactyl\Services\Databases\DatabaseManagementService;

class StoreDatabaseRequest extends ClientApiRequest implements ClientPermissionsRequest
{
    public function permission(): string
    {
        return Permission::ACTION_DATABASE_CREATE;
    }

    public function rules(): array
    {
        $server = $this->route()->parameter('server');

        Assert::isInstanceOf($server, Server::class);

        return [
            'database' => [
                'bail',
                'required',
                'alpha_dash',
                'min:3',
                'max:48',
                // Yes, I am aware that you could have the same database name across two unique hosts. However,
                // I don't really care about that for this validation. We just want to make sure it is unique to
                // the server itself. No need for complexity.
                function (string $attribute, mixed $value, \Closure $fail) use ($server) {
                    if (Database::query()->where('server_id', $server->id)
                        ->where('database', DatabaseManagementService::generateUniqueDatabaseName($value, $server->id))->exists()) {
                        $fail($this->messages()['database.unique']);
                    }
                },
            ],
            'remote' => Database::getRulesForField('remote'),
        ];
    }

    public function messages(): array
    {
        return [
            'database.unique' => 'The database name you have selected is already in use by this server.',
        ];
    }
}
