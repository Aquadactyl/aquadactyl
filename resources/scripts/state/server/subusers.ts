export type SubuserPermission =
  | 'websocket.connect'
  | 'control.console'
  | 'control.start'
  | 'control.stop'
  | 'control.restart'
  | 'user.create'
  | 'user.read'
  | 'user.update'
  | 'user.delete'
  | 'file.create'
  | 'file.read'
  | 'file.update'
  | 'file.delete'
  | 'file.archive'
  | 'file.sftp'
  | 'allocation.read'
  | 'allocation.update'
  | 'startup.read'
  | 'startup.update'
  | 'database.create'
  | 'database.read'
  | 'database.update'
  | 'database.delete'
  | 'database.view_password'
  | 'schedule.create'
  | 'schedule.read'
  | 'schedule.update'
  | 'schedule.delete';

export interface Subuser {
  uuid: string;
  username: string;
  email: string;
  image: string;
  twoFactorEnabled: boolean;
  createdAt: Date;
  permissions: SubuserPermission[];

  can(permission: SubuserPermission): boolean;
}

export interface ServerSubuserState {
  data: Subuser[];
}

export interface ServerSubuserActions {
  setSubusers: (payload: Subuser[]) => void;
  appendSubuser: (payload: Subuser) => void;
  removeSubuser: (payload: string) => void;
}

export type ServerSubuserStore = ServerSubuserState & ServerSubuserActions;

export const createSubusersSlice = (
  set: (fn: (state: any) => any) => void,
): ServerSubuserStore => ({
  data: [],

  setSubusers: (payload) =>
    set((state) => ({
      subusers: {
        ...state.subusers,
        data: payload,
      },
    })),

  appendSubuser: (payload) =>
    set((state) => {
      let matched = false;
      const updated = state.subusers.data.map((user: Subuser) => {
        if (user.uuid === payload.uuid) {
          matched = true;
          return payload;
        }
        return user;
      });

      return {
        subusers: {
          ...state.subusers,
          data: matched ? updated : [...updated, payload],
        },
      };
    }),

  removeSubuser: (payload) =>
    set((state) => ({
      subusers: {
        ...state.subusers,
        data: state.subusers.data.filter(
          (user: Subuser) => user.uuid !== payload,
        ),
      },
    })),
});

export default createSubusersSlice;
