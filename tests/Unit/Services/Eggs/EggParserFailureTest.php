<?php

use Illuminate\Http\UploadedFile;
use Pterodactyl\Services\Eggs\EggParserService;
use Pterodactyl\Exceptions\Service\InvalidFileUploadException;

test('egg imports reject upload failures and unsupported formats before parsing variables', function (bool $uploadFailure) {
    $file = $uploadFailure ? new UploadedFile('/missing-upload', 'egg.json', error: UPLOAD_ERR_INI_SIZE, test: true)
        : UploadedFile::fake()->createWithContent('egg.json', '{"meta":{"version":"unknown"}}');
    expect(fn () => (new EggParserService())->handle($file))->toThrow(InvalidFileUploadException::class);
})->with([true, false]);

test('legacy eggs listing multiple Docker images retain every image during conversion', function () {
    $file = UploadedFile::fake()->createWithContent('egg.json', json_encode(['meta' => ['version' => 'PTDL_v1'], 'images' => ['image:one', 'image:two'], 'variables' => []]));
    expect((new EggParserService())->handle($file)['docker_images'])->toBe(['image:one' => 'image:one', 'image:two' => 'image:two']);
});
