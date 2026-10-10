export interface ProgressState {
  continuous: boolean;
  progress?: number;
}

export interface ProgressActions {
  startContinuous: () => void;
  setProgress: (payload: number | undefined) => void;
  setComplete: () => void;
}

export type ProgressStore = ProgressState & ProgressActions;

export const createProgressSlice = (
  set: (fn: (state: any) => any) => void,
): ProgressStore => ({
  continuous: false,
  progress: undefined,

  startContinuous: () =>
    set((state) => ({
      progress: {
        ...state.progress,
        continuous: true,
      },
    })),

  setProgress: (payload) =>
    set((state) => ({
      progress: {
        ...state.progress,
        progress: payload,
      },
    })),

  setComplete: () =>
    set((state) => ({
      progress: {
        ...state.progress,
        progress: state.progress.progress ? 100 : undefined,
        continuous: false,
      },
    })),
});

export default createProgressSlice;
