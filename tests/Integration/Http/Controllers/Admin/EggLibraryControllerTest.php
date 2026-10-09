<?php

use Pterodactyl\Models\Egg;
use Pterodactyl\Models\Nest;
use Pterodactyl\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Pterodactyl\Services\Eggs\EggDownloadService;
use Pterodactyl\Tests\Fixtures\EggDownloadFixture;

beforeEach(function () {
    Cache::setDefaultDriver('array');
    Cache::flush();
    Http::preventStrayRequests();
    $this->document = EggDownloadFixture::document();
    $this->apiStatus = 200;
    Http::fake(fn ($request) => Http::response(
        $request->url() === 'https://eggs.download/api/eggs' ? EggDownloadFixture::catalog() : $this->document,
        $this->apiStatus,
    ));
    $this->admin = User::factory()->admin()->create();
    $this->withHeaders(['Accept' => 'text/html']);
});

test('egg library is restricted to administrators', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->get(route('admin.egg-library.index'))->assertForbidden();
    $this->post(route('admin.egg-library.import', 'library-test'), [])->assertForbidden();
    Http::assertNothingSent();
});

test('catalog supports source and search filters', function () {
    $this->actingAs($this->admin)->get(route('admin.egg-library.index'))->assertOk()
        ->assertSee('Library Test Egg')->assertSee('Node.js Generic')->assertDontSee('Pelican Test');
    $this->get(route('admin.egg-library.index', ['q' => 'node']))->assertOk()
        ->assertSee('Node.js Generic')->assertDontSee('Library Test Egg');
    $this->get(route('admin.egg-library.index', ['q' => 'testing library']))->assertOk()
        ->assertSee('Library Test Egg')->assertDontSee('Node.js Generic');
    $this->get(route('admin.egg-library.index', ['source' => 'pelican', 'category' => 'testing']))->assertOk()
        ->assertSee('Pelican Test')->assertDontSee('Library Test Egg');
    Http::assertSentCount(1);
});

test('an API outage renders a useful catalog error', function () {
    $this->apiStatus = 503;
    $this->actingAs($this->admin)->get(route('admin.egg-library.index'))->assertOk()
        ->assertSee('eggs.download is temporarily unavailable.');
});

test('preview escapes remote markup and download returns just the egg', function () {
    $document = EggDownloadFixture::document();
    $document['readme'] = '<img src=x onerror=alert(1)>';
    $this->document = $document;
    $this->actingAs($this->admin)->get(route('admin.egg-library.show', 'library-test'))->assertOk()
        ->assertSee($document['readme'])->assertDontSee($document['readme'], false);
    $this->get(route('admin.egg-library.download', 'library-test'))->assertOk()
        ->assertHeader('Content-Disposition', 'attachment; filename="egg-library-test.json"')
        ->assertJsonPath('name', 'Library Test Egg')->assertJsonMissingPath('egg');
    Http::assertSentCount(1);
});

test('import stores a complete egg and its variables in the chosen nest', function () {
    $nest = Nest::factory()->create();
    $document = EggDownloadFixture::document();
    $response = $this->actingAs($this->admin)->post(route('admin.egg-library.import', 'library-test'), [
        'nest_id' => $nest->id, 'egg_hash' => hash('sha256', app(EggDownloadService::class)->encode($document['egg'])),
    ]);
    $egg = Egg::query()->where('nest_id', $nest->id)->where('name', 'Library Test Egg')->sole();
    $response->assertRedirect(route('admin.nests.egg.view', $egg->id));
    expect($egg->script_install)->toBe('echo library-preview')
        ->and($egg->docker_images)->toBe(['Test image' => 'example/library:latest'])
        ->and($egg->variables()->sole()->env_variable)->toBe('LIBRARY_TEST_VALUE');
});

test('remote names cannot inject markup into the page title', function () {
    $this->document['egg']['name'] = '</title><script>alert(1)</script>';
    $this->actingAs($this->admin)->get(route('admin.egg-library.show', 'library-test'))->assertOk()
        ->assertSee($this->document['egg']['name'])->assertDontSee($this->document['egg']['name'], false);
});

test('legacy PTDL v1 eggs are converted by the native importer', function () {
    $this->document['egg']['meta']['version'] = 'PTDL_v1';
    unset($this->document['egg']['docker_images']);
    $this->document['egg']['image'] = 'example/legacy:latest';
    $nest = Nest::factory()->create();
    $this->actingAs($this->admin)->post(route('admin.egg-library.import', 'library-test'), [
        'nest_id' => $nest->id,
        'egg_hash' => hash('sha256', app(EggDownloadService::class)->encode($this->document['egg'])),
    ])->assertRedirect();
    expect($nest->eggs()->sole()->docker_images)->toBe(['example/legacy:latest' => 'example/legacy:latest']);
});

test('repeated imports reuse an existing egg without changing it', function () {
    $nest = Nest::factory()->create();
    $body = ['nest_id' => $nest->id, 'egg_hash' => hash('sha256', app(EggDownloadService::class)->encode(EggDownloadFixture::document()['egg']))];
    $this->actingAs($this->admin)->post(route('admin.egg-library.import', 'library-test'), $body)->assertRedirect();
    $egg = $nest->eggs()->sole();
    $egg->update(['description' => 'Keep my custom settings.']);
    $this->post(route('admin.egg-library.import', 'library-test'), $body)->assertRedirect(route('admin.nests.egg.view', $egg->id));
    expect($nest->eggs()->count())->toBe(1)->and($egg->refresh()->description)->toBe('Keep my custom settings.')
        ->and($egg->variables()->count())->toBe(1);
});

test('an administrator can create a destination nest during import', function () {
    $this->actingAs($this->admin)->post(route('admin.egg-library.import', 'library-test'), [
        'nest_id' => 'new', 'new_nest_name' => 'Library Destination',
        'egg_hash' => hash('sha256', app(EggDownloadService::class)->encode(EggDownloadFixture::document()['egg'])),
    ])->assertRedirect();
    expect(Nest::query()->where('name', 'Library Destination')->sole()->eggs()->sole()->name)->toBe('Library Test Egg');
});

test('unsupported formats and changed previews cannot create nests or eggs', function (bool $unsupported) {
    $document = EggDownloadFixture::document();
    if ($unsupported) {
        $document['egg']['meta']['version'] = 'PLCN_v3';
    }
    $this->document = $document;
    $eggCount = Egg::query()->count();
    $nestCount = Nest::query()->count();
    $this->actingAs($this->admin)->withHeaders(['Accept' => 'application/json'])
        ->post(route('admin.egg-library.import', 'library-test'), [
            'nest_id' => 'new', 'new_nest_name' => 'Should not exist', 'egg_hash' => str_repeat('0', 64),
        ])->assertUnprocessable()->assertJsonPath('errors.0.meta.source_field', 'egg')
        ->assertJsonPath('errors.0.detail', $unsupported
            ? 'This egg uses an unsupported format. Choose a PTDL_v1 or PTDL_v2 egg.'
            : 'This egg changed since you opened the preview. Review the current version and import again.');
    expect(Egg::query()->count())->toBe($eggCount)->and(Nest::query()->count())->toBe($nestCount);
})->with([true, false]);

test('a failed egg import rolls back its newly created nest', function () {
    $document = EggDownloadFixture::document();
    $document['egg']['variables'][0]['env_variable'] = 'INVALID-VARIABLE';
    $this->document = $document;
    $eggCount = Egg::query()->count();
    $this->actingAs($this->admin)->withHeaders(['Accept' => 'application/json'])
        ->post(route('admin.egg-library.import', 'library-test'), [
            'nest_id' => 'new', 'new_nest_name' => 'Rolled-back nest',
            'egg_hash' => hash('sha256', app(EggDownloadService::class)->encode($document['egg'])),
        ])->assertUnprocessable();
    expect(Egg::query()->count())->toBe($eggCount)->and(Nest::query()->where('name', 'Rolled-back nest')->exists())->toBeFalse();
});

test('invalid destinations are rejected without downloading', function () {
    $this->actingAs($this->admin)->withHeaders(['Accept' => 'application/json'])
        ->post(route('admin.egg-library.import', 'library-test'), ['nest_id' => 999999, 'egg_hash' => str_repeat('0', 64)])
        ->assertUnprocessable()->assertJsonPath('errors.0.meta.source_field', 'nest_id');
    Http::assertNothingSent();
});
