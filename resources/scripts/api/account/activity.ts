import { useTanStackQuery, QueryResponse } from "@/lib/queryClient";
import { AxiosError } from "axios";
import http, { withQueryBuilderParams } from "@/api/http";
import {
  ActivityLogFilters,
  ActivityLogResult,
  toActivityLogResult,
} from "@/api/activity";
import useFilteredObject from "@/plugins/useFilteredObject";
import { useUserQueryKey } from "@/plugins/useQueryKey";

export type { ActivityLogFilters } from "@/api/activity";

const useActivityLogs = (
  filters?: ActivityLogFilters,
  config?: any,
): QueryResponse<ActivityLogResult, AxiosError> => {
  const key = useUserQueryKey([
    "account",
    "activity",
    JSON.stringify(useFilteredObject(filters || {})),
  ]);

  return useTanStackQuery<ActivityLogResult, AxiosError>(
    [key],
    async () => {
      const { data } = await http.get("/api/client/account/activity", {
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
