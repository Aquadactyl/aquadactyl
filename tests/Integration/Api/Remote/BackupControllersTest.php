<?php

use Aws\Result;
use Aws\Command;
use GuzzleHttp\Psr7\Request;
use Aws\S3\S3ClientInterface;
use Pterodactyl\Models\Backup;
use Pterodactyl\Models\Server;
use Pterodactyl\Extensions\Backups\BackupManager;
use Pterodactyl\Extensions\Filesystem\S3Filesystem;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use League\Flysystem\InMemory\InMemoryFilesystemAdapter;
use Pterodactyl\Http\Controllers\Api\Remote\Backups\BackupRemoteUploadController;

uses(DatabaseTransactions::class);

beforeEach(function () {
    $this->server = $this->createServerModel();
    $node = $this->server->node;
    $this->withHeader('Authorization', 'Bearer ' . $node->daemon_token_id . '.' . $node->getDecryptedKey());
    $this->backup = Backup::factory()->create(['server_id' => $this->server->id, 'is_successful' => false, 'completed_at' => null, 'is_locked' => true, 'ignored_files' => []]);
    $this->manager = Mockery::mock(BackupManager::class);
    $this->app->instance(BackupManager::class, $this->manager);
    $this->backupUrl = '/api/remote/backups/' . $this->backup->uuid;
    $this->s3 = Mockery::mock(S3ClientInterface::class);
    $this->s3Commands = [];
    $this->s3->shouldReceive('getCommand')->andReturnUsing(function ($operation, $values) {
        $this->s3Commands[] = [$operation, $values];

        return new Command($operation, $values);
    });
    $this->s3->shouldReceive('execute')->andReturn(new Result(['UploadId' => 'upload-test', 'Parts' => [['ETag' => 'part-etag', 'PartNumber' => 1]]]));
    $this->s3Adapter = new S3Filesystem($this->s3, 'test-bucket');
});

test('Wings backup completion preserves successful checksums and unlocks failed backups', function (bool $successful) {
    $this->manager->shouldReceive('adapter')->once()->andReturn(new InMemoryFilesystemAdapter());
    $this->postJson($this->backupUrl, ['successful' => $successful, 'checksum_type' => 'sha256', 'checksum' => 'checksum-test', 'size' => 1024])->assertNoContent();
    $backup = $this->backup->refresh();
    expect($backup->is_successful)->toBe($successful)->and($backup->is_locked)->toBe($successful)
        ->and($backup->bytes)->toBe($successful ? 1024 : 0)
        ->and($backup->checksum)->toBe($successful ? 'sha256:checksum-test' : null)
        ->and($backup->completed_at)->not->toBeNull();
    $this->assertDatabaseHas('activity_logs', ['event' => $successful ? 'server:backup.complete' : 'server:backup.fail']);
})->with([true, false]);

test('Wings cannot overwrite completed backups', function () {
    $this->backup->update(['is_successful' => true]);
    $this->manager->shouldNotReceive('adapter');
    $this->postJson($this->backupUrl, ['successful' => false])->assertBadRequest();
});

test('Wings rejects malformed backup completion metadata', function (array $payload) {
    $this->manager->shouldNotReceive('adapter');
    $this->postJson($this->backupUrl, $payload)->assertUnprocessable();
})->with([
    [['successful' => true]],
    [['successful' => true, 'checksum' => 'abc', 'checksum_type' => 'sha256', 'size' => 1, 'parts' => [['etag' => 'part']]]],
]);

test('Wings rejects another nodes backup operations before invoking storage', function (string $method, string $suffix, array $payload) {
    $other = $this->createServerModel();
    $this->backup->update(['server_id' => $other->id]);
    $this->manager->shouldNotReceive('adapter');
    $this->json($method, $this->backupUrl . $suffix, $payload)->assertForbidden();
    expect($this->s3Commands)->toBeEmpty();
})->with([['POST', '', ['successful' => false]], ['POST', '/restore', ['successful' => true]], ['GET', '?size=100', []]]);

test('Wings backup restoration clears the temporary server state and records its outcome', function (bool $successful) {
    $this->server->update(['status' => Server::STATUS_RESTORING_BACKUP]);
    $this->postJson($this->backupUrl . '/restore', ['successful' => $successful])->assertNoContent();
    expect($this->server->refresh()->status)->toBeNull();
    $this->assertDatabaseHas('activity_logs', ['event' => $successful ? 'server:backup.restore-complete' : 'server.backup.restore-failed']);
})->with([true, false]);

test('S3 multipart completion uses the supplied parts or retrieves missing parts and aborts failures', function (bool $successful, ?array $parts) {
    $this->backup->update(['upload_id' => 'upload-test']);
    $this->manager->shouldReceive('adapter')->once()->andReturn($this->s3Adapter);
    $this->postJson($this->backupUrl, ['successful' => $successful, 'checksum_type' => 'sha256', 'checksum' => 'abc', 'size' => 1024, 'parts' => $parts])->assertNoContent();
    $expected = ['Bucket' => 'test-bucket', 'Key' => $this->server->uuid . '/' . $this->backup->uuid . '.tar.gz', 'UploadId' => 'upload-test'];
    if (!$successful) {
        expect($this->s3Commands)->toBe([['AbortMultipartUpload', $expected]]);

        return;
    }
    expect(end($this->s3Commands))->toBe(['CompleteMultipartUpload', $expected + ['MultipartUpload' => ['Parts' => [['ETag' => 'part-etag', 'PartNumber' => 1]]]]]);
    expect(array_column($this->s3Commands, 0))->toBe($parts === null ? ['ListParts', 'CompleteMultipartUpload'] : ['CompleteMultipartUpload']);
})->with([[true, null], [true, [['etag' => 'part-etag', 'part_number' => 1]]], [false, null]]);

test('S3 completion handles missing upload IDs without silently marking successful uploads complete', function (bool $successful) {
    $this->manager->shouldReceive('adapter')->once()->andReturn($this->s3Adapter);
    $response = $this->postJson($this->backupUrl, ['successful' => $successful, 'checksum_type' => 'sha256', 'checksum' => 'abc', 'size' => 1024]);
    if ($successful) {
        $response->assertBadRequest();
    } else {
        $response->assertNoContent();
    }
    expect($this->s3Commands)->toBeEmpty();
})->with([true, false]);

test('S3 multipart upload URLs use bounded part sizes and optional storage classes', function (int $configuredSize, ?string $storageClass) {
    config()->set('backups.max_part_size', $configuredSize);
    config()->set('backups.disks.s3.storage_class', $storageClass);
    $partSize = $configuredSize > 0 ? $configuredSize : BackupRemoteUploadController::DEFAULT_MAX_PART_SIZE;
    $this->manager->shouldReceive('adapter')->once()->andReturn($this->s3Adapter);
    $this->s3->shouldReceive('createPresignedRequest')->twice()->with(Mockery::type(Command::class), Mockery::on(fn ($expires) => $expires->isFuture()))
        ->andReturn(new Request('PUT', 'https://s3.example.test/signed-part'));
    $this->getJson($this->backupUrl . '?size=' . ($partSize + 1))->assertOk()->assertExactJson(['parts' => ['https://s3.example.test/signed-part', 'https://s3.example.test/signed-part'], 'part_size' => $partSize]);
    expect($this->backup->refresh()->upload_id)->toBe('upload-test');
    expect(array_column($this->s3Commands, 0))->toBe(['CreateMultipartUpload', 'UploadPart', 'UploadPart']);
    $params = $this->s3Commands[0][1];
    expect($params)->toMatchArray(['Bucket' => 'test-bucket', 'Key' => $this->server->uuid . '/' . $this->backup->uuid . '.tar.gz', 'ContentType' => 'application/x-gzip']);
    if ($storageClass === null) {
        expect($params)->not->toHaveKey('StorageClass');
    } else {
        expect($params['StorageClass'])->toBe($storageClass);
    }
    expect($this->s3Commands[1][1]['PartNumber'])->toBe(1)->and($this->s3Commands[2][1]['PartNumber'])->toBe(2);
})->with([[1000, null], [-1, 'STANDARD_IA']]);

test('remote upload rejects missing sizes, completed backups and non-S3 adapters', function (string $invalidCase) {
    if ($invalidCase === 'completed') {
        $this->backup->update(['completed_at' => now()]);
    }
    if ($invalidCase === 'adapter') {
        $this->manager->shouldReceive('adapter')->once()->andReturn(new InMemoryFilesystemAdapter());
    } else {
        $this->manager->shouldNotReceive('adapter');
    }
    $this->getJson($this->backupUrl . ($invalidCase === 'size' ? '' : '?size=1'))->assertStatus($invalidCase === 'completed' ? 409 : 400);
    expect($this->s3Commands)->toBeEmpty();
})->with(['size', 'completed', 'adapter']);
