import { createStore } from 'zustand/vanilla';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import createFlashesSlice, { FlashStore } from '@/state/flashes';
import createUserSlice, { UserStore } from '@/state/user';
import createPermissionsSlice, { GloablPermissionsStore } from '@/state/permissions';
import createSettingsSlice, { SettingsStore } from '@/state/settings';
import createProgressSlice, { ProgressStore } from '@/state/progress';

export interface ApplicationStore {
    permissions: GloablPermissionsStore;
    flashes: FlashStore;
    user: UserStore;
    settings: SettingsStore;
    progress: ProgressStore;
}

export const appStore = createStore<ApplicationStore>((set, get) => ({
    permissions: createPermissionsSlice(set, get),
    flashes: createFlashesSlice(set),
    user: createUserSlice(set, get),
    settings: createSettingsSlice(set),
    progress: createProgressSlice(set),
}));

export const useAppStore = <T>(selector: (state: ApplicationStore) => T, equalityFn?: (a: T, b: T) => boolean): T => {
    return useSyncExternalStoreWithSelector(
        appStore.subscribe,
        appStore.getState,
        appStore.getState,
        selector,
        equalityFn,
    );
};

// Aliases for idiomatic or backward-compatible store consumption
export const useStoreState = useAppStore;
export function useStoreActions<Result>(mapActions: (actions: ApplicationStore) => Result): Result {
    return mapActions(appStore.getState());
}

// Easy-peasy store compatibility facade
export const store = {
    getState: () => appStore.getState(),
    getActions: () => appStore.getState(),
    subscribe: appStore.subscribe,
};

export default appStore;
