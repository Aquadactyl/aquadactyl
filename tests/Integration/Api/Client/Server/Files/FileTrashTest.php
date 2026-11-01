<?php

use GuzzleHttp\Psr7\Request;
use Pterodactyl\Models\User;
use GuzzleHttp\Psr7\Response;
use Pterodactyl\Models\Permission;
use Pterodactyl\Models\FileTrashItem;
use Pterodactyl\Services\Files\TrashPath;
use GuzzleHttp\Exception\BadResponseException;
use Pterodactyl\Repositories\Wings\DaemonFileRepository;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;

beforeEach(function () {
    config()->set('aquadactyl.features.file_trash', true);
    config()->set('aquadactyl.trash.retention_days', 7);
    $this->filesystem = [
        '/' => ['notes.txt' => ['name' => 'notes.txt', 'file' => true, 'content' => 'keep this content'], 'world' => ['name' => 'world', 'file' => false]],
        '/world' => ['region.mca' => ['name' => 'region.mca', 'file' => true, 'content' => 'world payload']],
    ];
    $this->renames = [];
    $this->deleted = [];
    $this->noOpRename = false;
    $this->failAfterMove = false;
    $this->failDelete = false;
    $this->failDirectory = false;
    $repository = Mockery::mock(DaemonFileRepository::class);
    $repository->allows('setServer')->andReturnSelf();
    $repository->allows('getDirectory')->andReturnUsing(function ($path) {
        if ($this->failDirectory) {
            throw new DaemonConnectionException(new BadResponseException('Directory unavailable', new Request('GET', 'https://wings.example.invalid'), new Response(503)));
        }
        $path = TrashPath::normalize($path);
        if (!isset($this->filesystem[$path])) {
            throw new DaemonConnectionException(new BadResponseException('Missing directory', new Request('GET', 'https://wings.example.invalid'), new Response(404)));
        }

        return array_values($this->filesystem[$path]);
    });
    $repository->allows('createDirectory')->andReturnUsing(function ($name, $parent) {
        $path = TrashPath::normalize($parent . '/' . $name);
        $this->filesystem[$path] ??= [];
        $this->filesystem[dirname($path)][$name] = ['name' => $name, 'file' => false];

        return new Response(204);
    });
    $repository->allows('renameFiles')->andReturnUsing(function ($root, $files) {
        foreach ($files as $file) {
            $from = TrashPath::normalize($root . '/' . $file['from']);
            $to = TrashPath::normalize($root . '/' . $file['to']);
            $this->renames[] = [$from, $to];
            if ($this->noOpRename) {
                continue;
            }
            $entry = $this->filesystem[dirname($from)][basename($from)] ?? null;
            if (!$entry) {
                continue;
            }
            if (isset($this->filesystem[dirname($to)][basename($to)])) {
                throw new RuntimeException('Destination exists');
            }
            $entry['name'] = basename($to);
            $this->filesystem[dirname($to)][basename($to)] = $entry;
            unset($this->filesystem[dirname($from)][basename($from)]);
            foreach (array_keys($this->filesystem) as $path) {
                if ($path === $from || str_starts_with($path, $from . '/')) {
                    $this->filesystem[$to . substr($path, strlen($from))] = $this->filesystem[$path];
                    unset($this->filesystem[$path]);
                }
            }
            if ($this->failAfterMove) {
                throw new DaemonConnectionException(new BadResponseException('Connection lost', new Request('PUT', 'https://wings.example.invalid'), new Response(504)));
            }
        }

        return new Response(204);
    });
    $repository->allows('deleteFiles')->andReturnUsing(function ($root, $files) {
        if ($this->failDelete) {
            throw new DaemonConnectionException(new BadResponseException('Node unavailable', new Request('POST', 'https://wings.example.invalid'), new Response(504)));
        }
        foreach ($files as $file) {
            $path = TrashPath::normalize($root . '/' . $file);
            $this->deleted[] = $path;
            unset($this->filesystem[dirname($path)][basename($path)]);
            foreach (array_keys($this->filesystem) as $directory) {
                if ($directory === $path || str_starts_with($directory, $path . '/')) {
                    unset($this->filesystem[$directory]);
                }
            }
        }

        return new Response(204);
    });
    $this->app->instance(DaemonFileRepository::class, $repository);
});

test('trash reconciliation retains recovery metadata when Wings directory listing fails', function () {
    [$user, $server] = $this->generateTestAccount();
    $this->actingAs($user)->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['notes.txt']])->assertNoContent();
    $item = FileTrashItem::first();
    $item->update(['ready' => false]);
    $this->failDirectory = true;
    expect(fn () => app(Pterodactyl\Services\Files\FileTrashService::class)->reconcile($server, $item))->toThrow(DaemonConnectionException::class);
    $this->assertDatabaseHas('file_trash_items', ['id' => $item->id]);
    expect($this->deleted)->toBe([]);
});

test('files and whole directories move to trash and restore with their contents', function () {
    [$user, $server] = $this->generateTestAccount();
    $this->actingAs($user)->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['notes.txt', 'world']])->assertNoContent();
    $items = FileTrashItem::where('server_id', $server->id)->get();
    expect($items)->toHaveCount(2)->and($items->every('ready'))->toBeTrue();
    expect($items->firstWhere('original_path', '/notes.txt')->is_file)->toBeTrue()
        ->and($items->firstWhere('original_path', '/world')->is_file)->toBeFalse();
    expect($this->filesystem['/'])->not->toHaveKeys(['notes.txt', 'world']);
    $this->getJson($this->link($server, 'trash'))->assertOk()->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 2)->assertJsonPath('data.0.is_file', false)->assertJsonPath('data.1.is_file', true);
    foreach ($items as $item) {
        expect($item->expires_at->timestamp)->toBe(now()->addDays(7)->timestamp);
        $this->postJson($this->link($server, 'trash/' . $item->uuid . '/restore'))->assertNoContent();
    }
    expect($this->filesystem['/']['notes.txt']['content'])->toBe('keep this content')
        ->and($this->filesystem['/world']['region.mca']['content'])->toBe('world payload')
        ->and(FileTrashItem::count())->toBe(0);
});

test('duplicate names from different directories have independent recovery locations', function () {
    [$user, $server] = $this->generateTestAccount();
    $this->filesystem['/world']['notes.txt'] = ['name' => 'notes.txt', 'file' => true, 'content' => 'other notes'];
    $this->actingAs($user)->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['notes.txt']])->assertNoContent();
    $this->postJson($this->link($server, 'trash'), ['root' => '/world', 'files' => ['notes.txt']])->assertNoContent();
    $items = FileTrashItem::where('server_id', $server->id)->get();
    expect($items->pluck('uuid')->unique())->toHaveCount(2)->and($items->pluck('original_path')->all())->toBe(['/notes.txt', '/world/notes.txt']);
});

test('restores refuse to overwrite a replacement file', function () {
    [$user, $server] = $this->generateTestAccount();
    $this->actingAs($user)->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['notes.txt']])->assertNoContent();
    $item = FileTrashItem::first();
    $this->filesystem['/']['notes.txt'] = ['name' => 'notes.txt', 'file' => true, 'content' => 'new content'];
    $this->postJson($this->link($server, 'trash/' . $item->uuid . '/restore'))->assertStatus(409);
    expect($this->filesystem['/']['notes.txt']['content'])->toBe('new content')->and($this->renames)->toHaveCount(1)->and(FileTrashItem::count())->toBe(1);
});

test('restore recreates missing parents and refuses symlink parents', function () {
    [$user, $server] = $this->generateTestAccount();
    $this->actingAs($user)->postJson($this->link($server, 'trash'), ['root' => '/world', 'files' => ['region.mca']])->assertNoContent();
    $item = FileTrashItem::first();
    unset($this->filesystem['/world']);
    $this->filesystem['/']['world']['symlink'] = true;
    $this->postJson($this->link($server, 'trash/' . $item->uuid . '/restore'))->assertStatus(409);
    unset($this->filesystem['/']['world']);
    $this->postJson($this->link($server, 'trash/' . $item->uuid . '/restore'))->assertNoContent();
    expect($this->filesystem['/world']['region.mca']['content'])->toBe('world payload');
});

test('an uncertain move response keeps recovery metadata and can be reconciled', function () {
    [$user, $server] = $this->generateTestAccount();
    $this->failAfterMove = true;
    $this->actingAs($user)->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['notes.txt']])->assertStatus(504);
    expect(FileTrashItem::first()->ready)->toBeFalse();
    $this->getJson($this->link($server, 'trash'))->assertOk()->assertJsonPath('data.0.ready', true);
    $this->failAfterMove = false;
    $item = FileTrashItem::first();
    $this->postJson($this->link($server, 'trash/' . $item->uuid . '/restore'))->assertNoContent();
    expect($this->filesystem['/']['notes.txt']['content'])->toBe('keep this content');
});

test('a Wings rename no-op is not reported as a successful move', function () {
    [$user, $server] = $this->generateTestAccount();
    $this->noOpRename = true;
    $this->actingAs($user)->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['notes.txt']])->assertStatus(409);
    expect(FileTrashItem::first()->ready)->toBeFalse()->and($this->filesystem['/']['notes.txt']['content'])->toBe('keep this content');
});

test('an uncertain restore is reconciled without deleting or overwriting the restored content', function () {
    [$user, $server] = $this->generateTestAccount();
    $this->actingAs($user)->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['notes.txt']])->assertNoContent();
    $item = FileTrashItem::first();
    $this->failAfterMove = true;
    $this->postJson($this->link($server, 'trash/' . $item->uuid . '/restore'))->assertStatus(504);
    expect(FileTrashItem::count())->toBe(1)->and($this->filesystem['/']['notes.txt']['content'])->toBe('keep this content');
    $this->getJson($this->link($server, 'trash'))->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);
    expect(FileTrashItem::count())->toBe(0)->and($this->filesystem['/']['notes.txt']['content'])->toBe('keep this content');
});

test('trash endpoints enforce permissions, server ownership and the admin switch', function () {
    [$owner, $server] = $this->generateTestAccount();
    $this->actingAs($owner)->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['notes.txt']])->assertNoContent();
    $item = FileTrashItem::first();
    $this->actingAs(User::factory()->create())->getJson($this->link($server, 'trash'))->assertNotFound();
    $this->actingAs($owner);
    config()->set('aquadactyl.features.file_trash', false);
    $this->getJson($this->link($server, 'trash'))->assertForbidden();
    $this->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['world']])->assertForbidden();
    $this->postJson($this->link($server, 'trash/' . $item->uuid . '/restore'))->assertForbidden();
    $this->deleteJson($this->link($server, 'trash/' . $item->uuid))->assertForbidden();
    expect(FileTrashItem::count())->toBe(1);
});

test('read only subusers can browse but cannot move restore or purge', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_READ]);
    $this->actingAs($user)->getJson($this->link($server, 'trash'))->assertOk();
    $this->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['notes.txt']])->assertForbidden();
    $this->postJson($this->link($server, 'trash/' . fake()->uuid() . '/restore'))->assertForbidden();
    $this->deleteJson($this->link($server, 'trash/' . fake()->uuid()))->assertForbidden();
});

test('delete permission alone cannot restore files', function () {
    [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_DELETE]);
    $this->actingAs($user)->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['notes.txt']])->assertNoContent();
    $item = FileTrashItem::first();
    $this->postJson($this->link($server, 'trash/' . $item->uuid . '/restore'))->assertForbidden();
    $this->deleteJson($this->link($server, 'trash/' . $item->uuid))->assertNoContent();
    expect($this->deleted)->toContain('/.aquadactyl-trash/' . $item->uuid);
});

test('trash item identifiers cannot access items on another server', function () {
    [$owner, $server] = $this->generateTestAccount();
    $this->actingAs($owner)->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['notes.txt']])->assertNoContent();
    $item = FileTrashItem::first();
    $other = $this->createServerModel(['owner_id' => $owner->id]);
    $this->postJson($this->link($other, 'trash/' . $item->uuid . '/restore'))->assertNotFound();
    $this->deleteJson($this->link($other, 'trash/' . $item->uuid))->assertNotFound();
    expect(FileTrashItem::count())->toBe(1);
});

test('traversal, reserved storage, duplicates and missing selections never move files', function (string $root, array $files, int $status) {
    [$user, $server] = $this->generateTestAccount();
    $this->actingAs($user)->postJson($this->link($server, 'trash'), ['root' => $root, 'files' => $files])->assertStatus($status);
    expect($this->renames)->toBe([])->and(FileTrashItem::count())->toBe(0);
})->with([
    ['/', ['../notes.txt'], 422],
    ['/', ['.'], 422],
    ['/', ['notes.txt', 'notes.txt'], 422],
    ['/', ['notes.txt', 'missing.txt'], 404],
    ['/', [TrashPath::DIRECTORY], 400],
    ['/.aquadactyl-trash', ['notes.txt'], 400],
    ['/../../', ['notes.txt'], 400],
]);

test('ordinary file APIs cannot access or manipulate reserved trash storage', function () {
    [$user, $server] = $this->generateTestAccount();
    $this->actingAs($user)->getJson($this->link($server, 'files/list') . '?directory=/.aquadactyl-trash')->assertStatus(400);
    $this->postJson($this->link($server, 'files/delete'), ['root' => '/', 'files' => ['.aquadactyl-trash']])->assertStatus(400);
    $this->putJson($this->link($server, 'files/rename'), ['root' => '/', 'files' => [['from' => 'notes.txt', 'to' => '.aquadactyl-trash/notes.txt']]])->assertStatus(400);
    expect($this->deleted)->toBe([])->and($this->renames)->toBe([]);
});

test('retention cleanup deletes only expired trash and retries failed node requests even when disabled', function () {
    [$user, $server] = $this->generateTestAccount();
    $this->actingAs($user)->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['notes.txt', 'world']])->assertNoContent();
    $expired = FileTrashItem::first();
    $expired->update(['expires_at' => now()->subMinute()]);
    $secondExpired = FileTrashItem::create(['uuid' => fake()->uuid(), 'server_id' => $server->id, 'original_path' => '/second.txt', 'is_file' => true, 'expires_at' => now()->subMinute(), 'ready' => true]);
    config()->set('aquadactyl.features.file_trash', false);
    $this->failDelete = true;
    $this->artisan('p:maintenance:prune-file-trash')->assertFailed();
    expect(FileTrashItem::count())->toBe(3);
    $this->failDelete = false;
    $this->artisan('p:maintenance:prune-file-trash')->assertSuccessful();
    expect(FileTrashItem::count())->toBe(1)->and($this->deleted)->toBe(['/.aquadactyl-trash/' . $expired->uuid, '/.aquadactyl-trash/' . $secondExpired->uuid]);
});

test('expired items cannot be restored and changed retention affects only new moves', function () {
    [$user, $server] = $this->generateTestAccount();
    $this->actingAs($user)->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['notes.txt']])->assertNoContent();
    $old = FileTrashItem::first();
    config()->set('aquadactyl.trash.retention_days', 14);
    $this->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['world']])->assertNoContent();
    expect($old->expires_at->timestamp)->toBe(now()->addDays(7)->timestamp)
        ->and(FileTrashItem::latest('id')->first()->expires_at->timestamp)->toBe(now()->addDays(14)->timestamp);
    $old->update(['expires_at' => now()->subSecond()]);
    $this->postJson($this->link($server, 'trash/' . $old->uuid . '/restore'))->assertStatus(409);
});

test('missing trash payloads cannot be restored and a no-op restore retains recovery metadata', function (bool $ready) {
    [$user, $server] = $this->generateTestAccount();
    $this->actingAs($user)->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['notes.txt']])->assertNoContent();
    $item = FileTrashItem::first();
    $item->update(['ready' => $ready]);
    if (!$ready) {
        unset($this->filesystem['/.aquadactyl-trash/' . $item->uuid]);
    } else {
        $this->noOpRename = true;
    }
    $this->postJson($this->link($server, 'trash/' . $item->uuid . '/restore'))->assertStatus(409);
    $this->assertDatabaseHas('file_trash_items', ['id' => $item->id]);
})->with([true, false]);

test('restore reconciles a completed rename before trying to move the same payload again', function () {
    [$user, $server] = $this->generateTestAccount();
    $this->actingAs($user)->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['notes.txt']])->assertNoContent();
    $item = FileTrashItem::first();
    $item->update(['restore_started_at' => now()]);
    $path = '/.aquadactyl-trash/' . $item->uuid;
    $this->filesystem['/']['notes.txt'] = $this->filesystem[$path]['notes.txt'];
    unset($this->filesystem[$path]['notes.txt']);
    $this->postJson($this->link($server, 'trash/' . $item->uuid . '/restore'))->assertNoContent();
    expect($this->renames)->toHaveCount(1)->and($this->filesystem['/']['notes.txt']['content'])->toBe('keep this content');
    $this->assertDatabaseMissing('file_trash_items', ['id' => $item->id]);
});

test('purging a missing item or a live item during retention cleanup leaves stored files untouched', function () {
    [$user, $server] = $this->generateTestAccount();
    $this->actingAs($user)->postJson($this->link($server, 'trash'), ['root' => '/', 'files' => ['notes.txt']])->assertNoContent();
    $item = FileTrashItem::first();
    $service = app(Pterodactyl\Services\Files\FileTrashService::class);
    $service->purge($server, $item, true);
    $missing = clone $item;
    $missing->uuid = fake()->uuid();
    $service->purge($server, $missing);
    expect($this->deleted)->toBe([]);
    FileTrashItem::whereKey($item->id)->update(['uuid' => '../unsafe']);
    $item->uuid = '../unsafe';
    expect(fn () => $service->purge($server, $item))->toThrow(RuntimeException::class, 'Invalid trash storage identifier');
    expect($this->deleted)->toBe([]);
});
