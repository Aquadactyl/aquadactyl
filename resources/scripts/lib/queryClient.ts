import {
  QueryClient,
  QueryKey,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { useCallback } from "react";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

export const mutateGlobal = async (key: QueryKey, data?: any) => {
  if (data !== undefined) {
    queryClient.setQueryData(key, data);
  } else {
    await queryClient.invalidateQueries({ queryKey: key });
  }
};

export type MutatorCallback<TData> = (current: TData) => any;

export interface QueryResponse<TData, TError = any> {
  data: TData | undefined;
  error: TError | null;
  isValidating: boolean;
  isLoading: boolean;
  mutate: (
    data?: TData | Promise<TData> | MutatorCallback<TData>,
    shouldRevalidate?: boolean,
  ) => Promise<TData | undefined>;
  refetch: () => Promise<any>;
}

export function useTanStackQuery<TData = unknown, TError = any>(
  queryKey: QueryKey | null | undefined,
  queryFn: () => Promise<TData>,
  options?: Omit<
    UseQueryOptions<TData, TError, TData, any>,
    "queryKey" | "queryFn"
  >,
): QueryResponse<TData, TError> {
  const qc = useQueryClient();
  const enabled =
    queryKey !== null && queryKey !== undefined && (options?.enabled ?? true);

  const result = useQuery<TData, TError>({
    queryKey: (queryKey || []) as QueryKey,
    queryFn,
    ...options,
    enabled,
  });

  const mutate = useCallback(
    async (
      newData?: TData | Promise<TData> | MutatorCallback<TData> | any,
      shouldRevalidate = true,
    ): Promise<TData | undefined> => {
      if (!queryKey) return undefined;

      if (typeof newData === "function") {
        const updater = newData as (current: TData | undefined) => any;
        qc.setQueryData<TData>(queryKey, (old) => updater(old as TData));
      } else if (newData !== undefined) {
        const resolved = await Promise.resolve(newData);
        qc.setQueryData<TData>(queryKey, resolved);
      }

      if (shouldRevalidate || newData === undefined) {
        await qc.invalidateQueries({ queryKey });
      }

      return qc.getQueryData<TData>(queryKey);
    },
    [qc, queryKey],
  );

  return {
    data: result.data,
    error: result.error ?? null,
    isValidating: result.isFetching,
    isLoading: result.isLoading,
    mutate,
    refetch: result.refetch,
  };
}
