import { renderHook } from "@testing-library/react";
import useEventListener from "./useEventListener";

describe("useEventListener hook", () => {
  it("attaches event listener to window and triggers callback when event fires", () => {
    const handler = vi.fn();

    renderHook(() => useEventListener("custom-panel-event", handler));

    const event = new CustomEvent("custom-panel-event", {
      detail: { status: "ready" },
    });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("removes event listener from window on unmount", () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => useEventListener("resize", handler));

    unmount();

    window.dispatchEvent(new Event("resize"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("uses the latest callback without re-attaching listener", () => {
    let count = 0;
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    const { rerender } = renderHook(({ cb }) => useEventListener("click", cb), {
      initialProps: {
        cb: () => {
          count += 1;
        },
      },
    });

    const initialAddCalls = addEventListenerSpy.mock.calls.length;

    // Rerender with updated callback
    rerender({
      cb: () => {
        count += 10;
      },
    });

    // Window listener was NOT re-attached
    expect(addEventListenerSpy.mock.calls.length).toBe(initialAddCalls);

    window.dispatchEvent(new Event("click"));
    expect(count).toBe(10);

    addEventListenerSpy.mockRestore();
  });

  it("does not attach listener if window.addEventListener is not supported", () => {
    const originalAddEventListener = window.addEventListener;
    // @ts-expect-error test unsupported environment
    window.addEventListener = undefined;

    expect(() => {
      renderHook(() => useEventListener("click", vi.fn()));
    }).not.toThrow();

    window.addEventListener = originalAddEventListener;
  });
});
