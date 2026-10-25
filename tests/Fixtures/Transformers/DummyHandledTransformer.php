<?php

namespace Pterodactyl\Tests\Fixtures\Transformers;

use Pterodactyl\Transformers\Api\Application\BaseTransformer;

class DummyHandledTransformer extends BaseTransformer
{
    public bool $handled = false;

    public function handle(): void
    {
        $this->handled = true;
    }

    public function getResourceName(): string
    {
        return 'dummy_handled';
    }
}
