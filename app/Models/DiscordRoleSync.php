<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Model;

class DiscordRoleSync extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['last_synced_at' => 'datetime'];
}
