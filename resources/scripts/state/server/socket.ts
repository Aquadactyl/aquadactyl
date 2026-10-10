import { Websocket } from "@/plugins/Websocket";

export interface SocketState {
  instance: Websocket | null;
  connected: boolean;
}

export interface SocketActions {
  setInstance: (payload: Websocket | null) => void;
  setConnectionState: (payload: boolean) => void;
}

export type SocketStore = SocketState & SocketActions;

export const createSocketSlice = (
  set: (fn: (state: any) => any) => void,
): SocketStore => ({
  instance: null,
  connected: false,

  setInstance: (payload) =>
    set((state) => ({
      socket: {
        ...state.socket,
        instance: payload,
      },
    })),

  setConnectionState: (payload) =>
    set((state) => ({
      socket: {
        ...state.socket,
        connected: payload,
      },
    })),
});

export default createSocketSlice;
