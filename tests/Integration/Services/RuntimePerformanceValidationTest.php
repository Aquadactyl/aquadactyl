<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\ApiKey;
use Pterodactyl\Models\Subuser;
use Pterodactyl\Models\Permission;
use Pterodactyl\Services\Api\KeyCreationService;
use Pterodactyl\Services\Servers\GetUserPermissionsService;

uses(Illuminate\Foundation\Testing\DatabaseTransactions::class);

test('permission lookup still works without preloaded subusers', function () {
    $server = $this->createServerModel();
    $user = User::factory()->create();
    Subuser::query()->create(['server_id' => $server->id, 'user_id' => $user->id, 'permissions' => [Permission::ACTION_CONTROL_CONSOLE]]);
    $server->unsetRelation('subusers');

    expect(app(GetUserPermissionsService::class)->handle($server, $user))->toBe([Permission::ACTION_CONTROL_CONSOLE]);
});

test('the explicit model validation bypass remains available for imports', function () {
    $user = User::factory()->create();
    $key = app(KeyCreationService::class)->setKeyType(ApiKey::TYPE_ACCOUNT)->handle(['user_id' => $user->id, 'memo' => 'Bypass test', 'allowed_ips' => []]);
    $key->skipValidation()->forceFill(['identifier' => 'imported'])->save();
    expect($key->fresh()->identifier)->toBe('imported');
});
