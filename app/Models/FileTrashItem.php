<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $server_id
 * @property string $uuid
 * @property string $original_path
 * @property bool $is_file
 * @property bool $ready
 * @property \Carbon\CarbonImmutable|null $restore_started_at
 * @property \Carbon\CarbonImmutable $created_at
 * @property \Carbon\CarbonImmutable $expires_at
 * @property Server $server
 */
class FileTrashItem extends Model
{
    protected $guarded = ['id'];

    protected bool $immutableDates = true;

    protected $casts = [
        'server_id' => 'integer',
        'is_file' => 'boolean',
        'ready' => 'boolean',
        'expires_at' => 'datetime',
        'restore_started_at' => 'datetime',
    ];

    public static array $validationRules = [
        'uuid' => 'required|uuid',
        'server_id' => 'required|integer',
        'original_path' => 'required|string',
        'expires_at' => 'required|date',
        'is_file' => 'required|boolean',
        'ready' => 'boolean',
    ];

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }
}
