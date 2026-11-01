<?php

namespace Pterodactyl\Models\Attributes;

#[\Attribute(\Attribute::TARGET_CLASS)]
class Identifiable
{
    public function __construct(public readonly string $prefix, public readonly string $column = 'uuid')
    {
    }
}
