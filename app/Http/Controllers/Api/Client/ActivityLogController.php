<?php

namespace Pterodactyl\Http\Controllers\Api\Client;

use Pterodactyl\Models\ActivityLog;
use Spatie\QueryBuilder\QueryBuilder;
use Pterodactyl\Services\Activity\ActivityLogFilterService;
use Pterodactyl\Http\Requests\Api\Client\ActivityLogRequest;
use Pterodactyl\Transformers\Api\Client\ActivityLogTransformer;

class ActivityLogController extends ClientApiController
{
    /**
     * Returns a paginated set of the user's activity logs.
     */
    public function __invoke(ActivityLogRequest $request, ActivityLogFilterService $filters): array
    {
        $query = $request->user()->activity()
            ->whereNotIn('activity_logs.event', ActivityLog::DISABLED_EVENTS);
        $events = $filters->availableEvents($query->getQuery());

        $activity = QueryBuilder::for($query)
            ->with('actor')
            ->allowedFilters($filters->allowedFilters($request->user()))
            ->allowedSorts(['timestamp'])
            ->defaultSort('-timestamp')
            ->orderBy('activity_logs.id', 'desc')
            ->paginate(min($request->query('per_page', 25), 100))
            ->appends($request->query());

        return $this->fractal->collection($activity)
            ->transformWith($this->getTransformer(ActivityLogTransformer::class))
            ->addMeta(['available_events' => $events])
            ->toArray();
    }
}
