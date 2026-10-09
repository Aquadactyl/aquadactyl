import { useDebugValue, useRef, useSyncExternalStore } from 'react';
import type { StoreApi } from 'zustand/vanilla';

type ReadonlyStoreApi<T> = Pick<StoreApi<T>, 'getState' | 'subscribe'>;

/**
 * Native React 18 store hook supporting selectors and custom equality functions
 * without requiring the legacy use-sync-external-store shim package.
 *
 * Uses `api.getState` for both client and SSR snapshots so static/SSR markup
 * immediately reflects current store mutations.
 */
export function useStoreWithEqualityFn<T, U>(
    api: ReadonlyStoreApi<T>,
    selector: (state: T) => U = (s: any) => s,
    equalityFn?: (a: U, b: U) => boolean,
): U {
    const lastSnapshotRef = useRef<T | undefined>(undefined);
    const lastSelectionRef = useRef<U | undefined>(undefined);

    const getSelection = (): U => {
        const nextSnapshot = api.getState();
        if (lastSnapshotRef.current !== nextSnapshot) {
            const nextSelection = selector(nextSnapshot);
            if (
                equalityFn !== undefined &&
                lastSelectionRef.current !== undefined &&
                equalityFn(lastSelectionRef.current, nextSelection)
            ) {
                return lastSelectionRef.current;
            }
            lastSnapshotRef.current = nextSnapshot;
            lastSelectionRef.current = nextSelection;
            return nextSelection;
        }
        return lastSelectionRef.current!;
    };

    const slice = useSyncExternalStore(api.subscribe, getSelection, getSelection);
    useDebugValue(slice);
    return slice;
}
