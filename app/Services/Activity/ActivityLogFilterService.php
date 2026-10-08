<?php

namespace Pterodactyl\Services\Activity;

use Pterodactyl\Models\User;
use Spatie\QueryBuilder\AllowedFilter;
use Illuminate\Database\Eloquent\Builder;

class ActivityLogFilterService
{
    public function allowedFilters(User $viewer): array
    {
        return [
            AllowedFilter::partial('event'),
            AllowedFilter::exact('event_exact', 'event'),
            AllowedFilter::callback('ip', function (Builder $query, $value) use ($viewer) {
                $query->where('activity_logs.ip', $value);
                // Filtering must not reveal an IP hidden by the response transformer.
                if (!$viewer->root_admin) {
                    $query->whereMorphedTo('actor', $viewer);
                }
            }),
            AllowedFilter::callback('period', function (Builder $query, $value) {
                $days = ['24h' => 1, '7d' => 7, '30d' => 30, '90d' => 90];
                $query->where('activity_logs.timestamp', '>=', now()->subDays($days[$value]));
            }),
            AllowedFilter::callback('source', function (Builder $query, $value) {
                if ($value === 'api') {
                    $query->whereNotNull('activity_logs.api_key_id');
                } elseif ($value === 'system') {
                    $query->whereNull('activity_logs.actor_id');
                } elseif ($value === 'sftp') {
                    $query->where(function (Builder $query) {
                        $query->where('activity_logs.event', 'like', 'server:sftp.%')
                            ->orWhere('activity_logs.event', 'like', 'auth:sftp.%');
                    });
                } else {
                    $query->whereNull('activity_logs.api_key_id')
                        ->whereNotNull('activity_logs.actor_id')
                        ->where('activity_logs.event', 'not like', 'server:sftp.%')
                        ->where('activity_logs.event', 'not like', 'auth:sftp.%');
                }
            }),
        ];
    }

    public function availableEvents(Builder $query): array
    {
        // Use the full visible history so choices remain available across filters/pages.
        return (clone $query)->select('activity_logs.event')->reorder()->distinct()->orderBy('activity_logs.event')
            ->pluck('activity_logs.event')->all();
    }
}
