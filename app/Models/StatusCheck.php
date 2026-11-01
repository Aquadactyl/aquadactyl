<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Model;

class StatusCheck extends Model
{
    public $timestamps = false;

    protected $guarded = ['id'];

    protected $casts = ['checked_at' => 'datetime'];
}
