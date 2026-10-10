import { useTanStackQuery, QueryResponse } from "@/lib/queryClient";
import { AxiosError } from "axios";
import http, { withQueryBuilderParams } from "@/api/http";
import {
  ActivityLogFilters,
  ActivityLogResult,
  toActivityLogResult,
} from "@/api/activity";
import useFilteredObject from "@/plugins/useFilteredObject";
import { useServerQueryKey } from "@/plugins/useQueryKey";
import { ServerContext } from "@/state/server";

export type { ActivityLogFilters } from "@/api/activity";

const useActivityLogs = (
  filters?: ActivityLogFilters,
  config?: any,
): QueryResponse<ActivityLogResult, AxiosError> => {
  const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);
  const key = useServerQueryKey(["activity", useFilteredObject(filters || {})]);

  return useTanStackQuery<ActivityLogResult, AxiosError>(
    [key],
    async () => {
      const { data } = await http.get(`/api/client/servers/${uuid}/activity`, {
        params: {
          ...withQueryBuilderParams(filters),
          include: ["actor"],
        },
      });

      return toActivityLogResult(data);
    },
    config,
  );
};

export { useActivityLogs };
