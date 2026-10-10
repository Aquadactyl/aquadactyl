import { FlashMessageType } from '@/components/MessageBox';
import { httpErrorToHuman } from '@/api/http';

export interface FlashMessage {
  id?: string;
  key?: string;
  type: FlashMessageType;
  title?: string;
  message: string;
}

export interface FlashState {
  items: FlashMessage[];
}

export interface FlashActions {
  addFlash: (payload: FlashMessage) => void;
  addError: (payload: { message: string; key?: string }) => void;
  clearAndAddHttpError: (payload: {
    error?: Error | any | null;
    key?: string;
  }) => void;
  clearFlashes: (key?: string | void) => void;
}

export type FlashStore = FlashState & FlashActions;

export const createFlashesSlice = (
  set: (fn: (state: any) => any) => void,
): FlashStore => ({
  items: [],

  addFlash: (payload) =>
    set((state) => ({
      flashes: {
        ...state.flashes,
        items: [...state.flashes.items, payload],
      },
    })),

  addError: (payload) =>
    set((state) => ({
      flashes: {
        ...state.flashes,
        items: [
          ...state.flashes.items,
          { type: 'error', title: 'Error', ...payload },
        ],
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
              type: 'error',
              title: 'Error',
              key: payload.key,
              message: httpErrorToHuman(payload.error),
            },
          ],
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
