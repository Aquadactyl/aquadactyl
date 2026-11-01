<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Model;

class WebhookEndpoint extends Model
{
    public const GROUPS = ['system', 'status.health', 'status.incident', 'updates.available', 'updates.installed'];

    protected $guarded = ['id'];

    protected $hidden = ['url', 'signing_secret'];

    protected $casts = ['enabled' => 'boolean', 'events' => 'array', 'revision' => 'integer', 'url' => 'encrypted', 'signing_secret' => 'encrypted'];
}
