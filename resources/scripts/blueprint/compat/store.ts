// Preserve the panel's existing store; a second Easy Peasy provider would split state.
export { useStoreState, useStoreActions } from "@/state";
import { store } from "@/state";

export type Actions<T> = T;
export type State<T> = T;
export type Action<_Model, Payload = void> = (payload: Payload) => void;
export type Thunk<_Model, Payload = void> = (payload: Payload) => Promise<void>;

export const useStore = () => store;
