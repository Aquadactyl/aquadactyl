import updateAccountEmail from "@/api/account/updateAccountEmail";

export interface UserData {
  uuid: string;
  username: string;
  email: string;
  language: string;
  rootAdmin: boolean;
  useTotp: boolean;
  createdAt: Date;
  updatedAt: Date;
  avatarUrl?: string | null;
  blurSensitiveData?: boolean;
}

export interface UserState {
  data?: UserData;
}

export interface UserActions {
  setUserData: (payload: UserData) => void;
  updateUserData: (payload: Partial<UserData>) => void;
  updateUserEmail: (payload: {
    email: string;
    password: string;
  }) => Promise<void>;
}

export type UserStore = UserState & UserActions;

export const createUserSlice = (
  set: (fn: (state: any) => any) => void,
  get: () => any,
): UserStore => ({
  data: undefined,

  setUserData: (payload) =>
    set((state) => ({
      user: {
        ...state.user,
        data: payload,
      },
    })),

  updateUserData: (payload) =>
    set((state) => ({
      user: {
        ...state.user,
        data: state.user.data ? { ...state.user.data, ...payload } : payload,
      },
    })),

  updateUserEmail: async (payload) => {
    await updateAccountEmail(payload.email, payload.password);
    get().user.updateUserData({ email: payload.email });
  },
});

export default createUserSlice;
