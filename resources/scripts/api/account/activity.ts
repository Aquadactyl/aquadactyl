import useSWR, { ConfigInterface, responseInterface } from 'swr';
import { AxiosError } from 'axios';
import http, { withQueryBuilderParams } from '@/api/http';
import { ActivityLogFilters, ActivityLogResult, toActivityLogResult } from '@/api/activity';
import useFilteredObject from '@/plugins/useFilteredObject';
import { useUserSWRKey } from '@/plugins/useSWRKey';

export type { ActivityLogFilters } from '@/api/activity';

const useActivityLogs = (
    filters?: ActivityLogFilters,
    config?: ConfigInterface<ActivityLogResult, AxiosError>
): responseInterface<ActivityLogResult, AxiosError> => {
    const key = useUserSWRKey(['account', 'activity', JSON.stringify(useFilteredObject(filters || {}))]);

    return useSWR<ActivityLogResult>(
        key,
        async () => {
            const { data } = await http.get('/api/client/account/activity', {
                params: {
                    ...withQueryBuilderParams(filters),
                    include: ['actor'],
                },
            });

            return toActivityLogResult(data);
        },
        { revalidateOnMount: false, ...(config || {}) }
    );
};

export { useActivityLogs };
