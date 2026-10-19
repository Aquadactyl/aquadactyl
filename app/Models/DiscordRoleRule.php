<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Model;

class DiscordRoleRule extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['enabled' => 'boolean', 'egg_id' => 'integer', 'node_id' => 'integer', 'minimum_servers' => 'integer'];
}
