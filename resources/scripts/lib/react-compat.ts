import React from 'react';

const reactWithUseId = React as typeof React & { useId?: () => string };
let nextId = 0;

// Keep IDs stable across renders for components using useId with React 16.
if (!reactWithUseId.useId) {
    reactWithUseId.useId = function useId() {
        const [id] = React.useState(() => `:r${nextId++}:`);

        return id;
    };
}

// Polyfill useSyncExternalStore for React 16 compatibility (Zustand 5, TanStack Query)
const reactWithSyncStore = React as typeof React & {
    useSyncExternalStore?: typeof import('use-sync-external-store/shim').useSyncExternalStore;
};

if (!reactWithSyncStore.useSyncExternalStore) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useSyncExternalStore } = require('use-sync-external-store/shim');
    reactWithSyncStore.useSyncExternalStore = useSyncExternalStore;
}
