<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Pterodactyl\Models\User;
use Pterodactyl\Models\Server;
use Pterodactyl\Models\Permission;
use Pterodactyl\Models\ActivityLog;
use Spatie\QueryBuilder\QueryBuilder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\JoinClause;
use Pterodactyl\Services\Activity\ActivityLogFilterService;
use Pterodactyl\Http\Requests\Api\Client\ActivityLogRequest;
use Pterodactyl\Transformers\Api\Client\ActivityLogTransformer;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;

class ActivityLogController extends ClientApiController
{
    /**
     * Returns the activity logs for a server.
     */
    public function __invoke(ActivityLogRequest $request, Server $server, ActivityLogFilterService $filters): array
    {
        $this->authorize(Permission::ACTION_ACTIVITY_READ, $server);

        $query = $server->activity()
            ->whereNotIn('activity_logs.event', ActivityLog::DISABLED_EVENTS)
            ->when(config('activity.hide_admin_activity'), function (Builder $builder) use ($server) {
                // We could do this with a query and a lot of joins, but that gets pretty
                // painful so for now we'll execute a simpler query.
                $subusers = $server->subusers()->pluck('user_id')->merge($server->owner_id);

                $builder->select('activity_logs.*')
                    ->leftJoin('users', function (JoinClause $join) {
                        $join->on('users.id', 'activity_logs.actor_id')
                            ->where('activity_logs.actor_type', (new User())->getMorphClass());
                    })
                    ->where(function (Builder $builder) use ($subusers) {
                        $builder->whereNull('users.id')
                            ->orWhere('users.root_admin', 0)
                            ->orWhereIn('users.id', $subusers);
                    });
            });
        $events = $filters->availableEvents($query->getQuery());

        $activity = QueryBuilder::for($query)
            ->with('actor')
            ->allowedSorts('timestamp')
            ->defaultSort('-timestamp')
            ->orderBy('activity_logs.id', 'desc')
            ->allowedFilters(...$filters->allowedFilters($request->user()))
            ->paginate(min($request->query('per_page', 25), 100))
            ->appends($request->query());

        return $this->fractal->collection($activity)
            ->transformWith($this->getTransformer(ActivityLogTransformer::class))
            ->addMeta(['available_events' => $events])
            ->toArray();
    }
}
