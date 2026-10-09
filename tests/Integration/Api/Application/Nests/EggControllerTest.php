<?php

use Illuminate\Support\Arr;
use Pterodactyl\Models\Egg;
use Illuminate\Http\Response;
use Pterodactyl\Transformers\Api\Application\EggTransformer;

test('list all eggs in nest', function () {
    $eggs = Egg::query()->where('nest_id', 1)->get();

    $response = $this->getJson('/api/application/nests/' . $eggs->first()->nest_id . '/eggs');
    $response->assertStatus(Response::HTTP_OK);
    $response->assertJsonCount(count($eggs), 'data');
    $response->assertJsonStructure([
        'object',
        'data' => [
            [
                'object',
                'attributes' => [
                    'id', 'uuid', 'nest', 'author', 'description', 'docker_image', 'startup', 'created_at', 'updated_at',
                    'script' => ['privileged', 'install', 'entry', 'container', 'extends'],
                    'config' => [
                        'files' => [],
                        'startup' => ['done'],
                        'stop',
                        'logs' => [],
                        'extends',
                    ],
                ],
            ],
        ],
    ]);

    foreach (array_get($response->json(), 'data') as $datum) {
        $egg = $eggs->where('id', '=', $datum['attributes']['id'])->first();

        $expected = json_encode(Arr::sortRecursive($datum['attributes']));
        $actual = json_encode(Arr::sortRecursive($this->getTransformer(EggTransformer::class)->transform($egg)));

        expect($actual)->toBe(
            $expected,
            'Unable to find JSON fragment: ' . PHP_EOL . PHP_EOL . "[$expected]" . PHP_EOL . PHP_EOL . 'within' . PHP_EOL . PHP_EOL . "[$actual]."
        );
    }
});

test('return single egg', function () {
    $egg = Egg::query()->findOrFail(1);

    $response = $this->getJson('/api/application/nests/' . $egg->nest_id . '/eggs/' . $egg->id);
    $response->assertStatus(Response::HTTP_OK);
    $response->assertJsonStructure([
        'object',
        'attributes' => [
            'id', 'uuid', 'nest', 'author', 'description', 'docker_image', 'startup', 'script' => [], 'config' => [], 'created_at', 'updated_at',
        ],
    ]);

    $response->assertJson([
        'object' => 'egg',
        'attributes' => $this->getTransformer(EggTransformer::class)->transform($egg),
    ], true);
});

test('return single egg with relationships', function () {
    $egg = Egg::query()->findOrFail(1);

    $response = $this->getJson('/api/application/nests/' . $egg->nest_id . '/eggs/' . $egg->id . '?include=servers,variables,nest');
    $response->assertStatus(Response::HTTP_OK);
    $response->assertJsonStructure([
        'object',
        'attributes' => [
            'relationships' => [
                'nest' => ['object', 'attributes'],
                'servers' => ['object', 'data' => []],
                'variables' => ['object', 'data' => []],
            ],
        ],
    ]);
});

test('get missing egg', function () {
    $egg = Egg::query()->findOrFail(1);

    $response = $this->getJson('/api/application/nests/' . $egg->nest_id . '/eggs/nil');
    $this->assertNotFoundJson($response);
});

test('error returned if no permission', function () {
    $egg = Egg::query()->findOrFail(1);
    $this->createNewDefaultApiKey($this->getApiUser(), ['r_eggs' => 0]);

    $response = $this->getJson('/api/application/nests/' . $egg->nest_id . '/eggs');
    $this->assertAccessDeniedJson($response);
});
