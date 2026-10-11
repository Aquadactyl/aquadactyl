<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountPasskey extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['credential_id', 'credential_id_hash', 'public_key'];

    protected $casts = ['transports' => 'array', 'signature_counter' => 'integer', 'last_used_at' => 'datetime'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
