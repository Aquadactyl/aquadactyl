import { renderHook } from "@testing-library/react";
import { useDeepMemoize } from "./useDeepMemoize";
import { useDeepCompareEffect } from "./useDeepCompareEffect";
import { useDeepCompareMemo } from "./useDeepCompareMemo";

describe("useDeepMemoize and deep comparison hooks", () => {
  it("useDeepMemoize maintains referential identity when object contents are equal", () => {
    let input = { a: 1, b: [2, 3] };

    const { result, rerender } = renderHook(() => useDeepMemoize(input));

    const firstRef = result.current;

    // Rerender with a new object reference but identical shape & values
    input = { a: 1, b: [2, 3] };
    rerender();

    expect(result.current).toBe(firstRef);

    // Rerender with different content
    input = { a: 2, b: [2, 3] };
    rerender();

    expect(result.current).not.toBe(firstRef);
    expect(result.current).toEqual({ a: 2, b: [2, 3] });
  });

  it("useDeepCompareEffect only executes effect callback when dependencies deeply change", () => {
    const callback = vi.fn();
    let deps = [{ filter: "active" }];

    const { rerender } = renderHook(() => useDeepCompareEffect(callback, deps));

    expect(callback).toHaveBeenCalledTimes(1);

    // Rerender with new array reference containing identical content
    deps = [{ filter: "active" }];
    rerender();

    // Effect should not run again
    expect(callback).toHaveBeenCalledTimes(1);

    // Rerender with changed content
    deps = [{ filter: "suspended" }];
    rerender();

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("useDeepCompareMemo only recalculates when dependencies deeply change", () => {
    const compute = vi.fn((val: number) => val * 10);
    let deps = [{ multiplier: 2 }];

    const { result, rerender } = renderHook(() =>
      useDeepCompareMemo(() => compute(deps[0].multiplier), deps),
    );

    expect(result.current).toBe(20);
    expect(compute).toHaveBeenCalledTimes(1);

    // Rerender with identical content
    deps = [{ multiplier: 2 }];
    rerender();

    expect(result.current).toBe(20);
    expect(compute).toHaveBeenCalledTimes(1);

    // Rerender with modified dependency
    deps = [{ multiplier: 5 }];
    rerender();

    expect(result.current).toBe(50);
    expect(compute).toHaveBeenCalledTimes(2);
  });
});
