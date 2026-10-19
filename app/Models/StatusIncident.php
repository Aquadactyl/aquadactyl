<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Model;

class StatusIncident extends Model
{
    public const STATES = ['investigating', 'identified', 'monitoring', 'resolved'];

    protected $guarded = ['id'];

    protected $casts = ['resolved_at' => 'datetime'];
}
