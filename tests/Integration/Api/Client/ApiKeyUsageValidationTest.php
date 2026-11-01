<?php

use Pterodactyl\Models\User;
use Pterodactyl\Models\ApiKey;
use Illuminate\Support\Facades\DB;
use Pterodactyl\Services\Api\KeyCreationService;
use Pterodactyl\Exceptions\Model\DataValidationException;

test('usage timestamps persist without repeating key identity validation queries', function () {
    $user = User::factory()->create();
    $key = app(KeyCreationService::class)->setKeyType(ApiKey::TYPE_ACCOUNT)->handle(['user_id' => $user->id, 'memo' => 'Usage test', 'allowed_ips' => []]);
    DB::enableQueryLog();
    DB::flushQueryLog();
    $key->forceFill(['last_used_at' => now()])->save();
    $queries = DB::getQueryLog();
    DB::disableQueryLog();
    expect(collect($queries)->filter(fn ($query) => str_starts_with(strtolower($query['query']), 'select'))->count())->toBe(0);
    expect($key->fresh()->last_used_at)->not->toBeNull();
});

test('changing an existing key still validates its identity', function () {
    $user = User::factory()->create();
    $key = app(KeyCreationService::class)->setKeyType(ApiKey::TYPE_ACCOUNT)->handle(['user_id' => $user->id, 'memo' => 'Usage test', 'allowed_ips' => []]);
    $key->identifier = 'invalid';
    expect(fn () => $key->save())->toThrow(DataValidationException::class);
});
