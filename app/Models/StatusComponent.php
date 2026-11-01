<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StatusComponent extends Model
{
    protected $guarded = ['id'];

    /** @return BelongsTo<Node, $this> */
    public function node(): BelongsTo
    {
        return $this->belongsTo(Node::class);
    }

    /** @return HasOne<StatusCheck, $this> */
    public function latestCheck(): HasOne
    {
        return $this->hasOne(StatusCheck::class)->latestOfMany();
    }
}
