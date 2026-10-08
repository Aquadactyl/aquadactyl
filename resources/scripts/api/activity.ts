import { ActivityLog, Transformers } from '@definitions/user';
import { FractalPaginatedResponse, PaginatedResult, QueryBuilderParams } from '@/api/http';
import { toPaginatedSet } from '@definitions/helpers';

export type ActivityLogFilters = QueryBuilderParams<'ip' | 'event' | 'event_exact' | 'period' | 'source', 'timestamp'>;

export interface ActivityLogResult extends PaginatedResult<ActivityLog> {
    availableEvents: string[];
}

export const toActivityLogResult = (
    data: FractalPaginatedResponse & { meta: { available_events?: string[] } },
): ActivityLogResult => ({
    ...toPaginatedSet(data, Transformers.toActivityLog),
    availableEvents: data.meta.available_events ?? [],
});
