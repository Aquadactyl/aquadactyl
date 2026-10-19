<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebhookDelivery extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['payload' => 'array', 'attempts' => 'integer', 'endpoint_revision' => 'integer', 'next_attempt_at' => 'datetime', 'delivered_at' => 'datetime'];

    /** @return BelongsTo<WebhookEndpoint, $this> */
    public function endpoint(): BelongsTo
    {
        return $this->belongsTo(WebhookEndpoint::class, 'webhook_endpoint_id');
    }
}
