<?php

namespace Pterodactyl\Tests\Fixtures\Transformers;

use Pterodactyl\Transformers\Api\Application\BaseTransformer;

class DummyApplicationTransformer extends BaseTransformer
{
    public function getResourceName(): string
    {
        return 'dummy';
    }

    public function testAuthorize(string $resource): bool
    {
        return $this->authorize($resource);
    }

    public function testFormatTimestamp(string $timestamp): string
    {
        return $this->formatTimestamp($timestamp);
    }

    public function testMakeTransformer(string $class)
    {
        return $this->makeTransformer($class);
    }
}
