import React, { createContext, useContext, useEffect, useRef } from 'react';
import getServer, { Server } from '@/api/server/getServer';
import createSocketSlice, { SocketStore } from './socket';
import createFilesSlice, { ServerFileStore } from '@/state/server/files';
import createSubusersSlice, { ServerSubuserStore } from '@/state/server/subusers';
import createSchedulesSlice, { ServerScheduleStore } from '@/state/server/schedules';
import createDatabasesSlice, { ServerDatabaseStore } from '@/state/server/databases';
import isEqual from 'react-fast-compare';
import { createStore } from 'zustand/vanilla';
import { useStore as useZustandStore } from 'zustand';

export type ServerStatus = 'offline' | 'starting' | 'stopping' | 'running' | null;

export interface ServerDataState {
    data?: Server;
    permissions: string[];
}

export interface ServerDataActions {
    getServer: (uuid: string) => Promise<void>;
    setServer: (payload: Server) => void;
    setServerFromState: (payload: (s: Server) => Server) => void;
    setPermissions: (payload: string[]) => void;
}

export type ServerDataStore = ServerDataState &
    ServerDataActions & {
        inConflictState: boolean;
        isInstalling: boolean;
    };

export interface ServerStatusStore {
    value: ServerStatus;
    setServerStatus: (status: ServerStatus) => void;
}

export interface ServerStore {
    server: ServerDataStore;
    subusers: ServerSubuserStore;
    databases: ServerDatabaseStore;
    files: ServerFileStore;
    schedules: ServerScheduleStore;
    socket: SocketStore;
    status: ServerStatusStore;
    clearServerState: () => void;
}

export const createServerStore = () => {
    return createStore<ServerStore>((set, get) => {
        const computeConflictState = (data?: Server): boolean => {
            if (!data) return false;
            return data.status !== null || data.isTransferring || data.isNodeUnderMaintenance;
        };

        const computeInstallingState = (data?: Server): boolean => {
            return data?.status === 'installing' || data?.status === 'install_failed';
        };

        const serverDataSlice: ServerDataStore = {
            data: undefined,
            permissions: [],
            inConflictState: false,
            isInstalling: false,

            getServer: async (uuid: string) => {
                const [serverData, permissions] = await getServer(uuid);
                get().server.setServer(serverData);
                get().server.setPermissions(permissions);
            },

            setServer: (payload: Server) =>
                set((state) => {
                    if (isEqual(payload, state.server.data)) {
                        return state;
                    }

                    return {
                        server: {
                            ...state.server,
                            data: payload,
                            inConflictState: computeConflictState(payload),
                            isInstalling: computeInstallingState(payload),
                        },
                    };
                }),

            setServerFromState: (payload: (s: Server) => Server) =>
                set((state) => {
                    if (!state.server.data) return state;

                    const output = payload(state.server.data);
                    if (isEqual(output, state.server.data)) {
                        return state;
                    }

                    return {
                        server: {
                            ...state.server,
                            data: output,
                            inConflictState: computeConflictState(output),
                            isInstalling: computeInstallingState(output),
                        },
                    };
                }),

            setPermissions: (payload: string[]) =>
                set((state) => {
                    if (isEqual(payload, state.server.permissions)) {
                        return state;
                    }

                    return {
                        server: {
                            ...state.server,
                            permissions: payload,
                        },
                    };
                }),
        };

        const statusSlice: ServerStatusStore = {
            value: null,
            setServerStatus: (payload) =>
                set((state) => ({
                    status: {
                        ...state.status,
                        value: payload,
                    },
                })),
        };

        return {
            server: serverDataSlice,
            status: statusSlice,
            socket: createSocketSlice(set),
            files: createFilesSlice(set),
            databases: createDatabasesSlice(set),
            subusers: createSubusersSlice(set),
            schedules: createSchedulesSlice(set),
            clearServerState: () =>
                set((state) => {
                    if (state.socket.instance) {
                        state.socket.instance.removeAllListeners();
                        state.socket.instance.close();
                    }

                    return {
                        server: {
                            ...state.server,
                            data: undefined,
                            permissions: [],
                            inConflictState: false,
                            isInstalling: false,
                        },
                        databases: {
                            ...state.databases,
                            data: [],
                        },
                        subusers: {
                            ...state.subusers,
                            data: [],
                        },
                        files: {
                            ...state.files,
                            directory: '/',
                            selectedFiles: [],
                        },
                        schedules: {
                            ...state.schedules,
                            data: [],
                        },
                        socket: {
                            ...state.socket,
                            instance: null,
                            connected: false,
                        },
                        status: {
                            ...state.status,
                            value: null,
                        },
                    };
                }),
        };
    });
};

type ServerStoreApi = ReturnType<typeof createServerStore>;
const ServerStoreReactContext = createContext<ServerStoreApi | null>(null);

let defaultServerStoreInstance: ServerStoreApi | null = null;
const getDefaultServerStore = (): ServerStoreApi => {
    if (!defaultServerStoreInstance) {
        defaultServerStoreInstance = createServerStore();
    }
    return defaultServerStoreInstance;
};

export const ServerContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const storeRef = useRef<ServerStoreApi>();
    if (!storeRef.current) {
        storeRef.current = createServerStore();
    }

    useEffect(() => {
        return () => {
            storeRef.current?.getState().clearServerState();
        };
    }, []);

    return <ServerStoreReactContext.Provider value={storeRef.current}>{children}</ServerStoreReactContext.Provider>;
};

export const ServerContext = {
    Provider: ServerContextProvider,
    useStoreState: <Result,>(
        mapState: (state: ServerStore) => Result,
        equalityFn?: (a: Result, b: Result) => boolean,
    ): Result => {
        const store = useContext(ServerStoreReactContext) || getDefaultServerStore();
        return useZustandStore(store, mapState);
    },
    useStoreActions: <Result,>(mapActions: (actions: ServerStore) => Result): Result => {
        const store = useContext(ServerStoreReactContext) || getDefaultServerStore();
        return mapActions(store.getState());
    },
    useStore: <Result = ServerStore,>(selector?: (state: ServerStore) => Result): Result | ServerStoreApi => {
        const store = useContext(ServerStoreReactContext) || getDefaultServerStore();
        if (selector) {
            return useZustandStore(store, selector);
        }
        return store;
    },
};

export function useServerStore<Result>(selector: (state: ServerStore) => Result): Result {
    const store = useContext(ServerStoreReactContext) || getDefaultServerStore();
    return useZustandStore(store, selector);
}

export default ServerContext;
