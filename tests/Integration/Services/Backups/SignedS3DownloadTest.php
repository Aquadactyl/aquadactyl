<?php

use Pterodactyl\Models\Backup;
use Pterodactyl\Services\Backups\DownloadLinkService;
use Illuminate\Foundation\Testing\DatabaseTransactions;

uses(DatabaseTransactions::class);

test('S3 backup downloads use a short-lived signed URL for only the requested object', function () {
    $server = $this->createServerModel();
    $backup = Backup::factory()->create(['server_id' => $server->id, 'disk' => Backup::ADAPTER_AWS_S3]);
    config()->set('backups.disks.s3', ['adapter' => 's3', 'key' => 'coverage-key', 'secret' => 'coverage-secret', 'region' => 'eu-west-2', 'bucket' => 'coverage-backups']);
    $url = app(DownloadLinkService::class)->handle($backup, $server->user);
    expect($url)->toContain($server->uuid . '/' . $backup->uuid . '.tar.gz', 'X-Amz-Signature=');
    parse_str(parse_url($url, PHP_URL_QUERY), $query);
    // Signing can cross a clock tick, so the lifetime can be slightly below five minutes.
    expect((int) $query['X-Amz-Expires'])->toBeGreaterThan(0)->toBeLessThanOrEqual(300);
    expect($url)->not->toContain('coverage-secret');
});
