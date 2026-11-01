<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Model;

class AccountNotificationPreference extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['discord_webhook'];

    protected $casts = ['site_events' => 'array', 'discord_events' => 'array', 'discord_webhook' => 'encrypted', 'revision' => 'integer'];
}
