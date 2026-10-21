<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountNotification extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['site' => 'boolean', 'read_at' => 'datetime', 'discord_next_attempt_at' => 'datetime', 'discord_revision' => 'integer', 'discord_attempts' => 'integer'];

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }
}
