<?php

namespace Pterodactyl\Tests\Fixtures\Transformers;

use Pterodactyl\Models\Server;
use Pterodactyl\Transformers\Api\Client\BaseClientTransformer;

class DummyClientTransformer extends BaseClientTransformer
{
    public function getResourceName(): string
    {
        return 'dummy_client';
    }

    public function testAuthorize(string $ability, ?Server $server = null): bool
    {
        return $this->authorize($ability, $server);
    }

    public function testMakeTransformer(string $class)
    {
        return $this->makeTransformer($class);
    }
}
