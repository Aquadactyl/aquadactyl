import { useDeepCompareMemo } from '@/plugins/useDeepCompareMemo';
import { ServerContext } from '@/state/server';
import { useStoreState } from '@/state/hooks';

// eslint-disable-next-line @typescript-eslint/ban-types
type Context = string | string[] | (string | number | null | {})[];

function useQueryContextKey(context: Context, prefix: string | null = null): string {
    const key = useDeepCompareMemo((): string => {
        return (Array.isArray(context) ? context : [context]).map((value) => JSON.stringify(value)).join(':');
    }, [context]);

    if (!key.trim().length) {
        throw new Error('Must provide a valid context key to "useQueryContextKey".');
    }

    return `query::${prefix ? `${prefix}:` : ''}${key.trim()}`;
}

function useServerQueryKey(context: Context): string {
    const uuid = ServerContext.useStoreState((state) => state.server.data?.uuid);

    return useQueryContextKey(context, `server:${uuid}`);
}

function useUserQueryKey(context: Context): string {
    const uuid = useStoreState((state) => state.user.data?.uuid);

    return useQueryContextKey(context, `user:${uuid}`);
}

export default useQueryContextKey;
export { useServerQueryKey, useUserQueryKey };

// Backward compatibility aliases
export const useSWRKey = useQueryContextKey;
export const useServerSWRKey = useServerQueryKey;
export const useUserSWRKey = useUserQueryKey;
