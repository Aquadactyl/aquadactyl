<?php

use Illuminate\Http\Request;
use Pterodactyl\Models\User;
use Illuminate\Routing\Route;
use Pterodactyl\Models\ApiKey;
use Laravel\Sanctum\TransientToken;
use Illuminate\Support\Facades\Validator;
use Pterodactyl\Http\Requests\Admin\BaseFormRequest;
use Pterodactyl\Http\Requests\FrontendUserFormRequest;
use Pterodactyl\Http\Requests\Api\Application\Nodes\GetNodesRequest;
use Pterodactyl\Http\Requests\Api\Client\Servers\Files\UploadFileRequest;
use Pterodactyl\Http\Requests\Api\Remote\AuthenticateWebsocketDetailsRequest;

test('administrative and frontend forms enforce roles and normalize only their declared fields', function () {
    $admin = BaseFormRequest::create('/', 'POST', ['company' => 'Aquadactyl', 'unexpected' => 'ignored']);
    $admin->setUserResolver(fn () => null);
    expect($admin->authorize())->toBeFalse();
    $admin->setUserResolver(fn () => User::factory()->make(['root_admin' => false]));
    expect($admin->authorize())->toBeFalse();
    $admin->setUserResolver(fn () => User::factory()->make(['root_admin' => true]));
    expect($admin->authorize())->toBeTrue()->and($admin->normalize())->toBe(['company' => 'Aquadactyl']);
    $form = new class extends FrontendUserFormRequest {
        public function rules(): array
        {
            return ['name' => 'required|string'];
        }
    };
    $form->merge(['name' => 'User', 'extra' => 'ignored']);
    $form->setUserResolver(fn () => null);
    expect($form->authorize())->toBeFalse();
    $form->setUserResolver(fn () => User::factory()->make());
    expect($form->authorize())->toBeTrue()->and($form->normalize())->toBe(['name' => 'User']);
});

test('application form authorization accepts stateful and account tokens but requires a defined ACL resource', function () {
    $user = User::factory()->make();
    $request = new GetNodesRequest();
    $request->setUserResolver(fn () => $user);
    $user->withAccessToken(new TransientToken());
    expect($request->authorize())->toBeTrue();
    $user->withAccessToken((new ApiKey())->forceFill(['key_type' => ApiKey::TYPE_ACCOUNT]));
    expect($request->authorize())->toBeTrue();
    $invalid = new class extends Pterodactyl\Http\Requests\Api\Application\ApplicationApiRequest {
        protected ?string $resource = null;
    };
    expect(fn () => $invalid->authorize())->toThrow(Pterodactyl\Exceptions\PterodactylException::class);
});

test('client forms with server permissions fail closed when the server route parameter is missing', function () {
    $request = new UploadFileRequest();
    $route = new Route('GET', '/upload', fn () => null);
    $route->bind(Request::create('/upload'));
    $request->setRouteResolver(fn () => $route);
    expect($request->authorize())->toBeFalse();
});

test('remote websocket requests require a string server identifier', function () {
    $request = new AuthenticateWebsocketDetailsRequest();
    expect($request->authorize())->toBeTrue();
    expect(Validator::make(['server_uuid' => 'server-uuid'], $request->rules())->passes())->toBeTrue();
    expect(Validator::make(['server_uuid' => []], $request->rules())->fails())->toBeTrue();
});
