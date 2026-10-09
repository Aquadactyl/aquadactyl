import { useStore as useZustandStore } from 'zustand';
import { appStore, ApplicationStore } from '@/state';

// Easy-peasy typed hooks compatibility
export type State<T = ApplicationStore> = T;
export type Actions<T = ApplicationStore> = T;
export type ActionCreator<T> = T extends (payload: infer P) => any ? (payload: P) => void : (payload: T) => void;

export function useStoreState<Result>(mapState: (state: ApplicationStore) => Result): Result {
    return useZustandStore(appStore, mapState);
}

export function useStoreActions<Result>(mapActions: (actions: ApplicationStore) => Result): Result {
    // Actions are stable functions attached to the store state in our slices
    return mapActions(appStore.getState());
}

export const useStoreDispatch = () => {
    return (action: any) => action;
};

export const useStore = () => appStore;

export const StoreProvider: React.FC<{ store?: any; children: React.ReactNode }> = ({ children }) => {
    return <>{children}</>;
};
