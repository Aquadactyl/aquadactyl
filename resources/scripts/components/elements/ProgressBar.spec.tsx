import React from "react";
import { render, act, cleanup } from "@testing-library/react";
import ProgressBar from "./ProgressBar";
import { store } from "@/state";

describe("ProgressBar component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    store.getActions().progress.setProgress(undefined);
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    cleanup();
  });

  it("does not render when progress is 0 or undefined", () => {
    const { container } = render(<ProgressBar />);
    expect(container.querySelector(".bg-cyan-400")).toBeNull();
  });

  it("renders with style width matching the progress percentage", () => {
    act(() => {
      store.getActions().progress.setProgress(45);
    });

    const { container } = render(<ProgressBar />);
    const bar = container.querySelector<HTMLElement>(".bg-cyan-400");

    expect(bar).toBeDefined();
    expect(bar?.style.width).toBe("45%");
  });

  it("clears progress after reaching 100% via timeout", () => {
    render(<ProgressBar />);

    act(() => {
      store.getActions().progress.setProgress(100);
    });

    expect(store.getState().progress.progress).toBe(100);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(store.getState().progress.progress).toBeUndefined();
  });

  it("sets initial progress when continuous mode is turned on", () => {
    render(<ProgressBar />);

    act(() => {
      store.getActions().progress.startContinuous();
    });

    const currentProgress = store.getState().progress.progress;
    expect(currentProgress).toBeGreaterThanOrEqual(20);
    expect(currentProgress).toBeLessThanOrEqual(30);
  });

  it("advances continuous progress over time and caps at 90", () => {
    render(<ProgressBar />);

    act(() => {
      store.getActions().progress.startContinuous();
    });

    const initial = store.getState().progress.progress!;

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(store.getState().progress.progress!).toBeGreaterThan(initial);

    // Set progress to >= 90 in continuous mode
    act(() => {
      store.getActions().progress.setProgress(95);
    });

    expect(store.getState().progress.progress).toBe(90);

    // Turn off continuous via setComplete
    act(() => {
      store.getActions().progress.setComplete();
    });

    expect(store.getState().progress.continuous).toBe(false);
  });

  it("cleans up timers on unmount", () => {
    const { unmount } = render(<ProgressBar />);

    act(() => {
      store.getActions().progress.setProgress(100);
      store.getActions().progress.startContinuous();
    });

    expect(() => unmount()).not.toThrow();
  });

  it("increments progress from 0 in continuous mode", () => {
    render(<ProgressBar />);
    act(() => {
      store.getActions().progress.startContinuous();
    });
    act(() => {
      store.getActions().progress.setProgress(0);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(store.getState().progress.progress!).toBeGreaterThan(0);
  });
});
