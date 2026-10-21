import { FlashMessageType } from "@/components/MessageBox";
import { httpErrorToHuman } from "@/api/http";

export interface FlashMessage {
  id?: string;
  key?: string;
  type: FlashMessageType;
  title?: string;
  message: string;
}

export interface FlashState {
  items: FlashMessage[];
  toasts: FlashMessage[];
}

export interface FlashActions {
  dismissToast: (id: string) => void;
  addFlash: (payload: FlashMessage) => void;
  addError: (payload: { message: string; key?: string }) => void;
  clearAndAddHttpError: (payload: {
    error?: Error | any | null;
    key?: string;
  }) => void;
  clearFlashes: (key?: string | void) => void;
}

export type FlashStore = FlashState & FlashActions;

let nextToastId = 0;
const toast = (message: FlashMessage): FlashMessage => ({
  ...message,
  id: `toast-${++nextToastId}`,
});

export const createFlashesSlice = (
  set: (fn: (state: any) => any) => void,
): FlashStore => ({
  items: [],
  toasts: [],

  dismissToast: (id) =>
    set((state) => ({
      flashes: {
        ...state.flashes,
        toasts: state.flashes.toasts.filter(
          (item: FlashMessage) => item.id !== id,
        ),
      },
    })),

  addFlash: (payload) =>
    set((state) => ({
      flashes: {
        ...state.flashes,
        items: [...state.flashes.items, payload],
        toasts: [...state.flashes.toasts, toast(payload)].slice(-5),
      },
    })),

  addError: (payload) =>
    set((state) => ({
      flashes: {
        ...state.flashes,
        items: [
          ...state.flashes.items,
          { type: "error", title: "Error", ...payload },
        ],
        toasts: [
          ...state.flashes.toasts,
          toast({ type: "error", title: "Error", ...payload }),
        ].slice(-5),
      },
    })),

  clearAndAddHttpError: (payload) =>
    set((state) => {
      if (!payload.error) {
        return {
          flashes: {
            ...state.flashes,
            items: [],
          },
        };
      }

      console.error(payload.error);

      return {
        flashes: {
          ...state.flashes,
          items: [
            {
              type: "error",
              title: "Error",
              key: payload.key,
              message: httpErrorToHuman(payload.error),
            },
          ],
          toasts: [
            ...state.flashes.toasts,
            toast({
              type: "error",
              title: "Error",
              message: httpErrorToHuman(payload.error),
            }),
          ].slice(-5),
        },
      };
    }),

  clearFlashes: (payload) =>
    set((state) => ({
      flashes: {
        ...state.flashes,
        items: payload
          ? state.flashes.items.filter(
              (item: FlashMessage) => item.key !== payload,
            )
          : [],
      },
    })),
});

export default createFlashesSlice;
