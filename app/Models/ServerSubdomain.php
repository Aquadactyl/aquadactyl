<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServerSubdomain extends Model
{
    use HasUuids;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['records' => 'array', 'minecraft_srv' => 'boolean'];
    }

    /** @return BelongsTo<SubdomainDomain, $this> */
    public function domain(): BelongsTo
    {
        return $this->belongsTo(SubdomainDomain::class, 'domain_id');
    }

    /** @return BelongsTo<Server, $this> */
    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }

    public function hostname(): string
    {
        return $this->label . '.' . $this->domain->domain;
    }
}
