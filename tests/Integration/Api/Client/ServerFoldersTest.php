<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\Subuser;
use Illuminate\Support\Facades\DB;

test('personal folders can be created renamed and listed across requests', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $id = $this->actingAs($user)->postJson('/api/client/account/server-folders', ['name' => '  Production  '])
        ->assertOk()->assertJsonPath('name', 'Production')->json('id');
    $this->actingAs($other)->postJson('/api/client/account/server-folders', ['name' => 'Production'])->assertOk();
    $this->actingAs($user)->putJson("/api/client/account/server-folders/$id", ['name' => 'Minecraft'])->assertOk();
    $this->getJson('/api/client/account/server-folders')->assertOk()->assertExactJson(['data' => [['id' => $id, 'name' => 'Minecraft']]]);
});

test('folder names are validated', function (mixed $name) {
    $user = User::factory()->create();
    $this->actingAs($user)->postJson('/api/client/account/server-folders', ['name' => $name])
        ->assertUnprocessable()->assertJsonPath('errors.0.meta.source_field', 'name');
})->with(['empty' => [' '], 'long' => [str_repeat('a', 65)], 'array' => [[]]]);

test('duplicate personal folder names are rejected', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->postJson('/api/client/account/server-folders', ['name' => 'Games'])->assertOk();
    $this->postJson('/api/client/account/server-folders', ['name' => 'Games'])->assertUnprocessable();
});

test('another users folders cannot be renamed deleted or used as a filter', function (string $operation) {
    $users = User::factory()->count(2)->create();
    $id = $this->actingAs($users[0])->postJson('/api/client/account/server-folders', ['name' => 'Private'])->json('id');
    $this->actingAs($users[1]);
    (match ($operation) {
        'rename' => $this->putJson("/api/client/account/server-folders/$id", ['name' => 'Changed']),
        'delete' => $this->deleteJson("/api/client/account/server-folders/$id"),
        'filter' => $this->getJson("/api/client?folder=$id"),
    })->assertNotFound();
})->with(['rename', 'delete', 'filter']);

test('server folders filter before pagination and can be cleared', function () {
    [$user, $first] = $this->generateTestAccount();
    $second = $this->createServerModel(['user_id' => $user->id]);
    $third = $this->createServerModel(['user_id' => $user->id]);
    $id = $this->actingAs($user)->postJson('/api/client/account/server-folders', ['name' => 'Games'])->json('id');
    foreach ([$first, $second] as $server) {
        $this->putJson("/api/client/account/server-folders/servers/$server->uuid", ['folder_id' => $id])->assertNoContent();
    }
    $this->getJson("/api/client?folder=$id&per_page=1&page=2")->assertOk()
        ->assertJsonPath('meta.pagination.total', 2)->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.attributes.uuid', $second->uuid)->assertJsonPath('data.0.attributes.folder_id', $id);
    $this->getJson('/api/client?folder=unfiled')->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.attributes.uuid', $third->uuid)->assertJsonPath('data.0.attributes.folder_id', null);
    $this->putJson("/api/client/account/server-folders/servers/$second->uuid", ['folder_id' => null])->assertNoContent();
    $this->getJson('/api/client?folder=unfiled')->assertOk()->assertJsonCount(2, 'data');
});

test('subusers can organise a shared server independently of its owner', function () {
    [$owner, $server] = $this->generateTestAccount();
    $subuser = User::factory()->create();
    Subuser::query()->create(['user_id' => $subuser->id, 'server_id' => $server->id, 'permissions' => []]);
    foreach ([$owner, $subuser] as $user) {
        $id = $this->actingAs($user)->postJson('/api/client/account/server-folders', ['name' => 'My games'])->json('id');
        $this->putJson("/api/client/account/server-folders/servers/$server->uuid", ['folder_id' => $id])->assertNoContent();
        $this->getJson('/api/client')->assertOk()->assertJsonPath('data.0.attributes.folder_id', $id);
    }
    $ownerFolder = DB::table('server_folders')->where('user_id', $owner->id)->value('id');
    $this->actingAs($owner)->getJson('/api/client')->assertOk()->assertJsonPath('data.0.attributes.folder_id', $ownerFolder);
    $this->deleteJson("/api/client/account/server-folders/$ownerFolder")->assertNoContent();
    $this->assertDatabaseHas('servers', ['id' => $server->id]);
    expect(DB::table('server_folder_assignments')->where('user_id', $owner->id)->count())->toBe(0)
        ->and(DB::table('server_folder_assignments')->where('user_id', $subuser->id)->count())->toBe(1);
});

test('folder assignments cannot use another accounts folder', function () {
    [$user, $server] = $this->generateTestAccount();
    $other = User::factory()->create();
    $id = $this->actingAs($other)->postJson('/api/client/account/server-folders', ['name' => 'Private'])->json('id');
    $this->actingAs($user)->putJson("/api/client/account/server-folders/servers/$server->uuid", ['folder_id' => $id])
        ->assertUnprocessable()->assertJsonPath('errors.0.meta.source_field', 'folder_id');
});

test('folder assignment requires access to the server even when removing an assignment', function (bool $remove) {
    [$owner, $server] = $this->generateTestAccount();
    $user = User::factory()->create();
    $id = $this->actingAs($user)->postJson('/api/client/account/server-folders', ['name' => 'Mine'])->json('id');
    $this->putJson("/api/client/account/server-folders/servers/$server->uuid", ['folder_id' => $remove ? null : $id])->assertNotFound();
})->with([false, true]);

test('revoking subuser access also removes that server from folder results', function () {
    [$owner, $server] = $this->generateTestAccount();
    $user = User::factory()->create();
    $subuser = Subuser::query()->create(['user_id' => $user->id, 'server_id' => $server->id, 'permissions' => []]);
    $id = $this->actingAs($user)->postJson('/api/client/account/server-folders', ['name' => 'Shared'])->json('id');
    $this->putJson("/api/client/account/server-folders/servers/$server->uuid", ['folder_id' => $id])->assertNoContent();
    $subuser->delete();
    $this->getJson("/api/client?folder=$id")->assertOk()->assertJsonCount(0, 'data');
    $this->putJson("/api/client/account/server-folders/servers/$server->uuid", ['folder_id' => null])->assertNotFound();
});

test('admins can organise other servers without changing their owner', function () {
    [$owner, $server] = $this->generateTestAccount();
    $admin = User::factory()->create(['root_admin' => true]);
    $id = $this->actingAs($admin)->postJson('/api/client/account/server-folders', ['name' => 'Customers'])->json('id');
    $this->putJson("/api/client/account/server-folders/servers/$server->uuid", ['folder_id' => $id])->assertNoContent();
    $this->getJson("/api/client?type=admin&folder=$id")->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.attributes.folder_id', $id);
    expect($server->fresh()->owner_id)->toBe($owner->id);
    $this->actingAs($owner)->getJson('/api/client')->assertOk()->assertJsonPath('data.0.attributes.folder_id', null);
    $server->delete();
    $this->assertDatabaseCount('server_folder_assignments', 0);
});

test('invalid folder query parameters are rejected', function (string $folder) {
    $user = User::factory()->create();
    $this->actingAs($user)->getJson('/api/client?folder=' . urlencode($folder))->assertUnprocessable();
})->with(['0', '-1', 'abc', '1 OR 1=1']);

test('disabled folders reject all folder operations for users and admins', function (bool $admin) {
    [$user, $server] = $this->generateTestAccount();
    $user->forceFill(['root_admin' => $admin])->save();
    $id = $this->actingAs($user)->postJson('/api/client/account/server-folders', ['name' => 'Saved'])->json('id');
    config()->set('aquadactyl.features.server_folders', false);
    $this->getJson('/api/client/account/server-folders')->assertForbidden();
    $this->postJson('/api/client/account/server-folders', ['name' => 'New'])->assertForbidden();
    $this->putJson("/api/client/account/server-folders/$id", ['name' => 'Changed'])->assertForbidden();
    $this->deleteJson("/api/client/account/server-folders/$id")->assertForbidden();
    $this->putJson("/api/client/account/server-folders/servers/$server->uuid", ['folder_id' => $id])->assertForbidden();
    $this->assertDatabaseHas('server_folders', ['id' => $id, 'name' => 'Saved']);
})->with([false, true]);

test('disabling folders ignores old filters hides assignments and preserves saved organisation', function () {
    [$user, $first] = $this->generateTestAccount();
    $this->createServerModel(['user_id' => $user->id]);
    $id = $this->actingAs($user)->postJson('/api/client/account/server-folders', ['name' => 'Keep'])->json('id');
    $this->putJson("/api/client/account/server-folders/servers/$first->uuid", ['folder_id' => $id])->assertNoContent();
    config()->set('aquadactyl.features.server_folders', false);
    foreach ([$id, 'unfiled'] as $filter) {
        DB::enableQueryLog();
        $this->getJson("/api/client?folder=$filter")->assertOk()->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.attributes.folder_id', null);
        expect(collect(DB::getQueryLog())->pluck('query')->filter(fn ($sql) => str_contains($sql, 'server_folder')))->toBeEmpty();
        DB::disableQueryLog();
        DB::flushQueryLog();
    }
    config()->set('aquadactyl.features.server_folders', true);
    $this->getJson('/api/client/account/server-folders')->assertOk()->assertJsonPath('data.0.name', 'Keep');
    $this->getJson("/api/client?folder=$id")->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.attributes.folder_id', $id);
});
