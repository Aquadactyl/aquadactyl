<?php

test('server and backup lists reject pagination values that can bypass query limits', function (string $endpoint, string $query, string $field) {
    [$user, $server] = $this->generateTestAccount();
    $url = $endpoint === 'servers' ? '/api/client' : '/api/client/servers/' . $server->uuid . '/backups';
    $this->actingAs($user)->getJson($url . '?' . $query)
        ->assertUnprocessable()->assertJsonPath('errors.0.meta.source_field', $field);
})->with(['servers', 'backups'])->with([
    ['per_page=-1', 'per_page'],
    ['per_page=0', 'per_page'],
    ['per_page=1.5', 'per_page'],
    ['per_page=invalid', 'per_page'],
    ['per_page[]=1', 'per_page'],
    ['page=-1', 'page'],
    ['page=2147483648', 'page'],
]);

test('valid client pagination keeps the default sizes and existing upper caps', function (string $endpoint, string $query, int $expected) {
    [$user, $server] = $this->generateTestAccount();
    $url = $endpoint === 'servers' ? '/api/client' : '/api/client/servers/' . $server->uuid . '/backups';
    $this->actingAs($user)->getJson($url . $query)->assertOk()
        ->assertJsonPath('meta.pagination.per_page', $expected);
})->with([
    ['servers', '', 50],
    ['servers', '?per_page=10000', 100],
    ['backups', '', 20],
    ['backups', '?per_page=10000', 50],
]);
