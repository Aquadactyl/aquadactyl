<?php

use Illuminate\Support\Facades\Log;
use Pterodactyl\Models\ActivityLog;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

beforeEach(function () {
    $this->server = $this->createServerModel();
    $node = $this->server->node;
    $this->withHeader('Authorization', 'Bearer ' . $node->daemon_token_id . '.' . $node->getDecryptedKey());
    $this->datum = ['server' => $this->server->uuid, 'user' => $this->server->user->uuid,
        'event' => 'server:test.remote', 'ip' => '203.0.113.10', 'metadata' => ['file' => '/example.txt'], 'timestamp' => '2026-10-13T12:00:00.123Z'];
});

test('Wings activity batches retain user attribution and server subjects while rejecting other nodes and event domains', function () {
    $other = $this->createServerModel();
    $data = [$this->datum, array_replace($this->datum, ['server' => $other->uuid]), array_replace($this->datum, ['event' => 'auth:login'])];
    $this->postJson('/api/remote/activity', ['data' => $data])->assertSuccessful();
    $logs = ActivityLog::query()->where('event', 'server:test.remote')->get();
    expect($logs)->toHaveCount(1);
    $log = $logs->first();
    expect($log->actor_id)->toBe($this->server->owner_id)->and($log->actor_type)->toBe('user')
        ->and($log->properties['file'])->toBe('/example.txt')->and($log->ip)->toBe('203.0.113.10')
        ->and($log->timestamp->toIso8601String())->toBe('2026-10-13T12:00:00+00:00')
        ->and($log->subjects)->toHaveCount(1)->and($log->subjects->first()->subject_id)->toBe($this->server->id);
    $this->assertDatabaseMissing('activity_logs', ['event' => 'auth:login']);
});

test('Wings activity accepts events without a user or IP address', function () {
    unset($this->datum['user'], $this->datum['ip']);
    $this->postJson('/api/remote/activity', ['data' => [$this->datum]])->assertSuccessful();
    $log = ActivityLog::query()->where('event', 'server:test.remote')->firstOrFail();
    expect($log->actor_id)->toBeNull()->and($log->ip)->toBe('127.0.0.1');
});

test('invalid Wings activity timestamps retain their original value without discarding the batch', function () {
    $this->datum['timestamp'] = 'invalid-timestamp';
    $this->datum['user'] = null;
    Log::shouldReceive('warning')->once()->with(Mockery::type(Exception::class), ['timestamp' => 'invalid-timestamp']);
    $this->postJson('/api/remote/activity', ['data' => [$this->datum]])->assertSuccessful();
    $log = ActivityLog::query()->where('event', 'server:test.remote')->firstOrFail();
    expect($log->properties)->toMatchArray(['file' => '/example.txt', 'original_timestamp' => 'invalid-timestamp'])
        ->and($log->timestamp->timestamp)->toBe(now()->timestamp);
});

test('malformed Wings activity batches are rejected before inserting audit records', function (string $field, mixed $value) {
    $this->datum[$field] = $value;
    $this->postJson('/api/remote/activity', ['data' => [$this->datum]])->assertUnprocessable();
})->with([['server', 'invalid'], ['user', 'invalid'], ['event', null], ['metadata', 'invalid'], ['ip', 'invalid'], ['timestamp', 42]]);
