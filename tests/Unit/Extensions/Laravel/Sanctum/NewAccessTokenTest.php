<?php

use Pterodactyl\Models\ApiKey;
use Illuminate\Contracts\Support\Jsonable;
use Illuminate\Contracts\Support\Arrayable;
use Laravel\Sanctum\NewAccessToken as SanctumAccessToken;
use Pterodactyl\Extensions\Laravel\Sanctum\NewAccessToken;

test('access token wrapper supports Sanctum DTO contract', function () {
    $apiKey = ApiKey::factory()->make();
    $token = new NewAccessToken($apiKey, 'plain-text-token');

    expect($token)->toBeInstanceOf(Arrayable::class)
        ->and($token)->toBeInstanceOf(Jsonable::class)
        ->and($token)->not->toBeInstanceOf(SanctumAccessToken::class)
        ->and($token->accessToken)->toBe($apiKey)
        ->and($token->plainTextToken)->toBe('plain-text-token')
        ->and($token->toArray())->toBe([
            'accessToken' => $apiKey,
            'plainTextToken' => 'plain-text-token',
        ])
        ->and($token->toJson())->toBe(json_encode($token->toArray()));
});
