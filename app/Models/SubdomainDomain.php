<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Model;

class SubdomainDomain extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['api_token', 'zone_id'];

    protected function casts(): array
    {
        return ['api_token' => 'encrypted', 'enabled' => 'boolean'];
    }
}
