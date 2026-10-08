import { useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { ActivityLogFilters } from '@/api/activity';
import useLocationHash from '@/plugins/useLocationHash';

export default () => {
    const { hash, pathTo } = useLocationHash();
    const history = useHistory();
    const location = useLocation();
    const filters = useMemo<ActivityLogFilters>(
        () => ({
            page:
                /^\d+$/.test(hash.page || '') && Number.isSafeInteger(Number(hash.page))
                    ? Math.max(1, Number(hash.page))
                    : 1,
            sorts: { timestamp: hash.sort === 'oldest' ? 1 : -1 },
            filters: {
                event: hash.event,
                event_exact: hash.event_exact,
                ip: hash.ip,
                period: hash.period,
                source: hash.source,
            },
        }),
        [hash],
    );
    const update = (values: Record<string, string | undefined>, resetPage = true) => {
        history.push({ ...location, hash: pathTo({ ...(resetPage ? { page: undefined } : {}), ...values }) });
    };
    const clear = () => history.push({ ...location, hash: '' });
    const hasFilters = Boolean(hash.event || hash.event_exact || hash.ip || hash.period || hash.source || hash.sort);
    return { hash, filters, update, clear, hasFilters };
};
