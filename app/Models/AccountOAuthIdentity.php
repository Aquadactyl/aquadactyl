<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountOAuthIdentity extends Model
{
    protected $table = 'account_oauth_identities';

    protected $guarded = ['id'];

    protected $hidden = ['identity_hash', 'subject'];

    protected $casts = ['last_used_at' => 'datetime'];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function identityHash(string $provider, string $issuer, string $subject): string
    {
        return hash('sha256', json_encode([$provider, $issuer, $subject], JSON_THROW_ON_ERROR));
    }
}
