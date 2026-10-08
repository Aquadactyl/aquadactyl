import useSWR, { ConfigInterface, responseInterface } from 'swr';
import { AxiosError } from 'axios';
import http, { withQueryBuilderParams } from '@/api/http';
import { ActivityLogFilters, ActivityLogResult, toActivityLogResult } from '@/api/activity';
import useFilteredObject from '@/plugins/useFilteredObject';
import { useServerSWRKey } from '@/plugins/useSWRKey';
import { ServerContext } from '@/state/server';

export type { ActivityLogFilters } from '@/api/activity';

const useActivityLogs = (
    filters?: ActivityLogFilters,
    config?: ConfigInterface<ActivityLogResult, AxiosError>,
): responseInterface<ActivityLogResult, AxiosError> => {
    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);
    const key = useServerSWRKey(['activity', useFilteredObject(filters || {})]);

    return useSWR<ActivityLogResult>(
        key,
        async () => {
            const { data } = await http.get(`/api/client/servers/${uuid}/activity`, {
                params: {
                    ...withQueryBuilderParams(filters),
                    include: ['actor'],
                },
            });

            return toActivityLogResult(data);
        },
        { revalidateOnMount: false, ...(config || {}) },
    );
};

export { useActivityLogs };
