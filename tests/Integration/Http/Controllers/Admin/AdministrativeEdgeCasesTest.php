<?php

use Illuminate\Http\Request;
use Pterodactyl\Models\Node;
use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Services\Helpers\LogViewerService;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

beforeEach(function () { $this->actingAs(User::factory()->create(['root_admin' => true])); });

test('server creation without a node guides administrators to node setup', function () {
    Server::query()->delete();
    Node::query()->delete();
    $this->get('/admin/servers/new')->assertRedirect(route('admin.nodes'));
});

test('node creation without locations guides administrators to location setup', function () {
    $this->mock(Pterodactyl\Repositories\Eloquent\LocationRepository::class)->expects('all')->andReturn(collect());
    $this->get('/admin/nodes/new')->assertRedirect(route('admin.locations'));
});

test('the administrative nest creation page renders its form', function () {
    $this->get('/admin/nests/new')->assertOk()->assertViewIs('admin.nests.new');
});

test('a failed server installation reports a recoverable management error', function () {
    $server = $this->createServerModel(['status' => Server::STATUS_INSTALL_FAILED]);
    expect(fn () => app(Pterodactyl\Http\Controllers\Admin\Servers\ServerViewController::class)->manage(Request::create('/manage'), $server))->toThrow(Pterodactyl\Exceptions\DisplayException::class);
});

test('invalid startup service data is presented as validation feedback', function () {
    $server = $this->createServerModel();
    $validator = Illuminate\Support\Facades\Validator::make([], ['startup' => 'required']);
    $service = $this->mock(Pterodactyl\Services\Servers\StartupModificationService::class);
    $service->expects('setUserLevel')->andReturnSelf();
    $service->expects('handle')->andThrow(new Pterodactyl\Exceptions\Model\DataValidationException($validator, $server));
    expect(fn () => app(Pterodactyl\Http\Controllers\Admin\ServersController::class)->saveStartup(Request::create('/startup'), $server))->toThrow(Illuminate\Validation\ValidationException::class);
});

test('an empty log listing renders a blank log preview', function () {
    $viewer = $this->mock(LogViewerService::class);
    $viewer->expects('getLogFiles')->andReturn([]);
    $viewer->shouldNotReceive('getLogContent');
    $this->get('/admin/settings/logs')->assertOk()->assertViewHas('content', '');
});

test('legacy direct registration calls still honor the disabled registration switch', function () {
    config()->set('aquadactyl.features.registration', false);
    expect(fn () => app(Pterodactyl\Http\Controllers\Auth\RegisterController::class)->register(new Pterodactyl\Http\Requests\Auth\RegisterRequest()))->toThrow(Pterodactyl\Exceptions\DisplayException::class);
});

test('legacy egg import calls reject a blank destination name after a valid preview', function () {
    $document = Pterodactyl\Tests\Fixtures\EggDownloadFixture::document();
    Illuminate\Support\Facades\Http::fake(['*' => Illuminate\Support\Facades\Http::response($document)]);
    Illuminate\Support\Facades\Cache::forget('egg-download:detail:v1:library-test');
    $request = Pterodactyl\Http\Requests\Admin\Egg\EggDownloadImportRequest::create('/import', 'POST', ['nest_id' => 'new', 'new_nest_name' => '   ', 'egg_hash' => hash('sha256', app(Pterodactyl\Services\Eggs\EggDownloadService::class)->encode($document['egg']))]);
    expect(fn () => app(Pterodactyl\Http\Controllers\Admin\EggLibraryController::class)->import($request, 'library-test'))->toThrow(Illuminate\Validation\ValidationException::class);
});

test('server observers dispatch the saving event for extension integrations', function () {
    $server = $this->createServerModel();
    Illuminate\Support\Facades\Event::fake([Pterodactyl\Events\Server\Saving::class]);
    (new Pterodactyl\Observers\ServerObserver())->saving($server);
    Illuminate\Support\Facades\Event::assertDispatched(Pterodactyl\Events\Server\Saving::class, fn ($event) => $event->server->id === $server->id);
});
