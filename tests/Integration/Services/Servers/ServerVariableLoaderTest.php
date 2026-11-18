<?php

use Pterodactyl\Models\Server;
use Illuminate\Support\Facades\DB;
use Pterodactyl\Models\EggVariable;
use Pterodactyl\Models\ServerVariable;
use Illuminate\Database\Eloquent\Collection;
use Pterodactyl\Services\Servers\ServerVariableLoader;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('an empty daemon page does not query for variables', function () {
    DB::enableQueryLog();
    try {
        app(ServerVariableLoader::class)->load(new Collection());
        expect(DB::getQueryLog())->toBe([]);
    } finally {
        DB::disableQueryLog();
        DB::flushQueryLog();
    }
});

test('variable loading uses two queries for a full page and preserves overrides and defaults', function () {
    $first = $this->createServerModel();
    $variable = EggVariable::factory()->create(['egg_id' => $first->egg_id, 'default_value' => 'fallback']);
    $emptyEgg = Pterodactyl\Models\Egg::factory()->create([
        'nest_id' => $first->nest_id, 'config_from' => $first->egg_id,
        'author' => 'test@example.com', 'docker_images' => ['Test' => 'ghcr.io/pterodactyl/yolks:java_25'],
    ]);
    $servers = new Collection([$first]);
    for ($index = 1; $index < 25; ++$index) {
        $servers->push($this->createServerModel(['node_id' => $first->node_id, 'egg_id' => $index === 24 ? $emptyEgg->id : $first->egg_id]));
    }
    ServerVariable::create(['server_id' => $first->id, 'variable_id' => $variable->id, 'variable_value' => 'private-override']);
    // Fetch plain server models so no relationship cache can hide extra SQL.
    $servers = Server::whereKey($servers->modelKeys())->get();
    DB::enableQueryLog();
    try {
        app(ServerVariableLoader::class)->load($servers);
        expect(DB::getQueryLog())->toHaveCount(2);
        foreach ($servers as $index => $server) {
            expect($server->relationLoaded('variables'))->toBeTrue();
            if ($index === 24) {
                expect($server->variables)->toBeEmpty();
            } else {
                $loaded = $server->variables->firstWhere('id', $variable->id);
                expect($loaded->server_value ?? $loaded->default_value)->toBe($index === 0 ? 'private-override' : 'fallback');
            }
        }
        expect(DB::getQueryLog())->toHaveCount(2);
    } finally {
        DB::disableQueryLog();
        DB::flushQueryLog();
    }
});
