<?php

use Pterodactyl\Models\ApiKey;
use Pterodactyl\Services\Acl\Api\AdminAcl;

test('permissions evaluation', function (int $permission, int $check, bool $outcome) {
    expect(AdminAcl::can($permission, $check))->toBe($outcome);
})->with([
    [AdminAcl::READ, AdminAcl::READ, true],
    [AdminAcl::READ | AdminAcl::WRITE, AdminAcl::READ, true],
    [AdminAcl::READ | AdminAcl::WRITE, AdminAcl::WRITE, true],
    [AdminAcl::WRITE, AdminAcl::WRITE, true],
    [AdminAcl::READ, AdminAcl::WRITE, false],
    [AdminAcl::NONE, AdminAcl::READ, false],
    [AdminAcl::NONE, AdminAcl::WRITE, false],
]);

test('checking against model', function () {
    $model = ApiKey::factory()->make(['r_servers' => AdminAcl::READ | AdminAcl::WRITE]);

    expect(AdminAcl::check($model, AdminAcl::RESOURCE_SERVERS, AdminAcl::WRITE))->toBeTrue();
});
