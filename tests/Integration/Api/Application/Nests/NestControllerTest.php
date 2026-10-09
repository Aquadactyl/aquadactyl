<?php

use Illuminate\Http\Response;
use Pterodactyl\Contracts\Repository\NestRepositoryInterface;
use Pterodactyl\Transformers\Api\Application\NestTransformer;

test('nest response', function () {
    $repository = app(NestRepositoryInterface::class);
    /** @var \Pterodactyl\Models\Nest[] $nests */
    $nests = $repository->all();

    $response = $this->getJson('/api/application/nests');
    $response->assertStatus(Response::HTTP_OK);
    $response->assertJsonCount(count($nests), 'data');
    $response->assertJsonStructure([
        'object',
        'data' => [['object', 'attributes' => ['id', 'uuid', 'author', 'name', 'description', 'created_at', 'updated_at']]],
        'meta' => ['pagination' => ['total', 'count', 'per_page', 'current_page', 'total_pages']],
    ]);

    $response->assertJson([
        'object' => 'list',
        'data' => [],
        'meta' => [
            'pagination' => [
                'total' => 4,
                'count' => 4,
                'per_page' => 50,
                'current_page' => 1,
                'total_pages' => 1,
            ],
        ],
    ]);

    foreach ($nests as $nest) {
        $response->assertJsonFragment([
            'object' => 'nest',
            'attributes' => $this->getTransformer(NestTransformer::class)->transform($nest),
        ]);
    }
});

test('single nest response', function () {
    $repository = app(NestRepositoryInterface::class);
    $nest = $repository->find(1);

    $response = $this->getJson('/api/application/nests/' . $nest->id);
    $response->assertStatus(Response::HTTP_OK);
    $response->assertJsonStructure([
        'object',
        'attributes' => ['id', 'uuid', 'author', 'name', 'description', 'created_at', 'updated_at'],
    ]);

    $response->assertJson([
        'object' => 'nest',
        'attributes' => $this->getTransformer(NestTransformer::class)->transform($nest),
    ]);
});

test('single nest with eggs included', function () {
    $repository = app(NestRepositoryInterface::class);
    $nest = $repository->find(1);
    $nest->loadMissing('eggs');

    $response = $this->getJson('/api/application/nests/' . $nest->id . '?include=servers,eggs');
    $response->assertStatus(Response::HTTP_OK);
    $response->assertJsonStructure([
        'object',
        'attributes' => [
            'relationships' => [
                'eggs' => ['object', 'data' => []],
                'servers' => ['object', 'data' => []],
            ],
        ],
    ]);

    $response->assertJsonCount(count($nest->getRelation('eggs')), 'attributes.relationships.eggs.data');
});

test('get missing nest', function () {
    $response = $this->getJson('/api/application/nests/nil');
    $this->assertNotFoundJson($response);
});

test('error returned if no permission', function () {
    $repository = app(NestRepositoryInterface::class);
    $nest = $repository->find(1);
    $this->createNewDefaultApiKey($this->getApiUser(), ['r_nests' => 0]);

    $response = $this->getJson('/api/application/nests/' . $nest->id);
    $this->assertAccessDeniedJson($response);
});
