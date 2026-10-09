import { ServerDatabase } from '@/api/server/databases/getServerDatabases';

export interface ServerDatabaseState {
    data: ServerDatabase[];
}

export interface ServerDatabaseActions {
    setDatabases: (payload: ServerDatabase[]) => void;
    appendDatabase: (payload: ServerDatabase) => void;
    removeDatabase: (payload: string) => void;
}

export type ServerDatabaseStore = ServerDatabaseState & ServerDatabaseActions;

export const createDatabasesSlice = (set: (fn: (state: any) => any) => void): ServerDatabaseStore => ({
    data: [],

    setDatabases: (payload) =>
        set((state) => ({
            databases: {
                ...state.databases,
                data: payload,
            },
        })),

    appendDatabase: (payload) =>
        set((state) => {
            const exists = state.databases.data.some((db: ServerDatabase) => db.id === payload.id);
            const updated = exists
                ? state.databases.data.map((db: ServerDatabase) => (db.id === payload.id ? payload : db))
                : [...state.databases.data, payload];

            return {
                databases: {
                    ...state.databases,
                    data: updated,
                },
            };
        }),

    removeDatabase: (payload) =>
        set((state) => ({
            databases: {
                ...state.databases,
                data: state.databases.data.filter((db: ServerDatabase) => db.id !== payload),
            },
        })),
});

export default createDatabasesSlice;
