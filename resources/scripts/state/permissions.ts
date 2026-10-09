import getSystemPermissions from '@/api/getSystemPermissions';

export interface PanelPermissions {
    [key: string]: {
        description: string;
        keys: { [k: string]: string };
    };
}

export interface PermissionsState {
    data: PanelPermissions;
}

export interface PermissionsActions {
    setPermissions: (payload: PanelPermissions) => void;
    getPermissions: () => Promise<void>;
}

export type GloablPermissionsStore = PermissionsState & PermissionsActions;

export const createPermissionsSlice = (
    set: (fn: (state: any) => any) => void,
    get: () => any,
): GloablPermissionsStore => ({
    data: {},

    setPermissions: (payload) =>
        set((state) => ({
            permissions: {
                ...state.permissions,
                data: payload,
            },
        })),

    getPermissions: async () => {
        const permissions = await getSystemPermissions();
        get().permissions.setPermissions(permissions);
    },
});

export default createPermissionsSlice;
