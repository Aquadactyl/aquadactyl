import React, { createRef } from "react";
import { act, renderHook } from "@testing-library/react";
import useViewportVisibility from "./useViewportVisibility";

afterEach(() => vi.unstubAllGlobals());

it("keeps fetching available when intersection observers are unsupported", () => {
  vi.stubGlobal("IntersectionObserver", undefined);
  const { result } = renderHook(() =>
    useViewportVisibility(createRef<HTMLElement>()),
  );
  expect(result.current).toBe(true);
});

it("starts work near the viewport, pauses it on exit and disconnects on unmount", () => {
  let notify: IntersectionObserverCallback;
  const observe = vi.fn();
  const disconnect = vi.fn();
  const observer = vi.fn(function (callback, options) {
    notify = callback;
    expect(options).toEqual({ rootMargin: "200px" });
    return { observe, disconnect };
  });
  vi.stubGlobal("IntersectionObserver", observer);
  const ref = createRef<HTMLElement>();
  ref.current = document.createElement("article");
  const { result, unmount } = renderHook(() => useViewportVisibility(ref));
  expect(result.current).toBe(false);
  expect(observe).toHaveBeenCalledWith(ref.current);
  for (const visible of [true, false, true]) {
    act(() =>
      notify(
        [{ isIntersecting: visible } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(result.current).toBe(visible);
  }
  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});

it("does not observe a missing element", () => {
  const observer = vi.fn();
  vi.stubGlobal("IntersectionObserver", observer);
  const { result } = renderHook(() =>
    useViewportVisibility(createRef<HTMLElement>()),
  );
  expect(result.current).toBe(false);
  expect(observer).not.toHaveBeenCalled();
});
