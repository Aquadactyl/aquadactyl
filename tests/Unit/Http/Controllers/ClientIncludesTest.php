<?php

use Illuminate\Http\Request;
use Pterodactyl\Transformers\Api\Client\ServerTransformer;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;

test('client transformer includes trim comma-separated requests and discard unsupported includes', function () {
    $request = Request::create('/api/client', 'GET', ['include' => ' egg, invalid ']);
    app()->instance('request', $request);
    $controller = new class extends ClientApiController {
        public function includes(): array
        {
            return $this->getIncludesForTransformer(new ServerTransformer(), ['forced']);
        }
    };
    expect($controller->includes())->toBe(['egg', 'forced']);
});

test('Blueprint placeholder versions retain an unknown value before installer substitution', function () {
    $placeholder = new class extends Pterodactyl\BlueprintFramework\Services\PlaceholderService\BlueprintPlaceholderService {
        protected const VERSION = '::VERSION::';
    };
    expect($placeholder->version())->toBe('unknown');
});

test('public-key material limits reject blank oversized and null-containing inputs', function () {
    foreach (['', str_repeat('a', 100000), "ssh-ed25519 bad\0key"] as $key) {
        expect(Pterodactyl\Models\UserSSHKey::isSupportedPublicKeyMaterial($key))->toBeFalse();
    }
});

test('base repository model access remains available to extension subclasses', function () {
    $repository = app(Pterodactyl\Repositories\Eloquent\LocationRepository::class);
    $method = new ReflectionMethod(Pterodactyl\Repositories\Repository::class, 'getModel');
    expect($method->getClosure($repository)())->toBeInstanceOf(Pterodactyl\Models\Location::class);
});
