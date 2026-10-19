<?php

namespace Pterodactyl\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class BlueprintInstallation extends Model
{
    use HasUuids;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['allow_update' => 'boolean'];
    }

    public function archivePath(): string
    {
        return storage_path('app/blueprint-installations/' . $this->id . '.blueprint');
    }
}
