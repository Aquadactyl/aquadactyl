import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, renderHook, act } from "@testing-library/react";
import { UPlotChart, useChart, useChartTickLabel } from "./chart";

let resizeCallback: (entries: any[]) => void = () => {};
global.ResizeObserver = class {
  constructor(cb: any) {
    resizeCallback = cb;
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as any;

const mockUPlotConstructor = vi.fn();
const mockUPlotInstance = {
  setSize: vi.fn(),
  setData: vi.fn(),
  destroy: vi.fn(),
};

vi.mock("uplot", () => {
  class MockUPlot {
    constructor(...args: any[]) {
      mockUPlotConstructor(...args);
    }
    setSize = mockUPlotInstance.setSize;
    setData = mockUPlotInstance.setData;
    destroy = mockUPlotInstance.destroy;
  }
  return {
    default: MockUPlot,
  };
});

describe("components/server/console/chart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("UPlotChart", () => {
    it("renders container div and initializes uPlot instance", () => {
      const options = { width: 300, height: 160 } as any;
      const data = [
        [1, 2],
        [3, 4],
      ] as any;

      const { unmount } = render(
        <UPlotChart options={options} data={data} className="test-chart" />,
      );

      expect(mockUPlotConstructor).toHaveBeenCalledWith(
        expect.objectContaining({ width: 300, height: 160 }),
        data,
        expect.any(HTMLDivElement),
      );

      // Trigger resize with width 0 (does not setSize)
      act(() => {
        resizeCallback([{ contentRect: { width: 0 } }]);
      });

      // Trigger resize
      act(() => {
        resizeCallback([{ contentRect: { width: 450 } }]);
      });
      expect(mockUPlotInstance.setSize).toHaveBeenCalledWith({
        width: 450,
        height: 160,
      });

      // Unmount cleans up chart and disconnects observer
      unmount();
      expect(mockUPlotInstance.destroy).toHaveBeenCalled();
    });

    it("updates data on chart when data prop changes", () => {
      const options = { width: 300, height: 160 } as any;
      const initialData = [
        [1, 2],
        [3, 4],
      ] as any;
      const nextData = [
        [1, 2],
        [5, 6],
      ] as any;

      const { rerender } = render(
        <UPlotChart options={options} data={initialData} />,
      );
      rerender(<UPlotChart options={options} data={nextData} />);

      expect(mockUPlotInstance.setData).toHaveBeenCalledWith(nextData);
    });

    it("handles default height when options.height is undefined", () => {
      render(
        <UPlotChart
          options={{ width: 300 } as any}
          data={
            [
              [1, 2],
              [3, 4],
            ] as any
          }
        />,
      );
      expect(mockUPlotConstructor).toHaveBeenCalledWith(
        expect.objectContaining({ height: 160 }),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe("useChart", () => {
    it("returns default chart state and options", () => {
      const { result } = renderHook(() => useChart("CPU Load"));

      expect(result.current.props.data).toHaveLength(2); // x series + 1 data series
      expect(result.current.props.data[0]).toHaveLength(20);
      expect(result.current.props.options.axes?.[1].show).toBe(true);

      // Check values formatter
      const axisValuesFn = result.current.props.options.axes?.[1].values as any;
      const formatted = axisValuesFn(null, [10, 20]);
      expect(formatted).toEqual(["10", "20"]);

      // Check scales range function
      const rangeFn = (result.current.props.options.scales as any).y.range;
      const range = rangeFn(null, 0, 50);
      expect(range).toEqual([0, 50]);

      const rangeZero = rangeFn(null, 0, 0);
      expect(rangeZero).toEqual([0, 1]);
    });

    it("uses custom series, formatTick and suggestedMax", () => {
      const { result } = renderHook(() =>
        useChart("Custom", {
          sets: 2,
          suggestedMax: 100,
          formatTick: (v) => `${v}%`,
          series: [
            { label: "S1", stroke: "#fff", fill: "#000" },
            { label: "S2", stroke: "#aaa", fill: "#111" },
          ],
        }),
      );

      expect(result.current.props.data).toHaveLength(3); // x series + 2 sets
      const axisValuesFn = result.current.props.options.axes?.[1].values as any;
      expect(axisValuesFn(null, [25])).toEqual(["25%"]);

      const rangeFn = (result.current.props.options.scales as any).y.range;
      expect(rangeFn(null, 0, 50)).toEqual([0, 100]); // suggestedMax is 100
    });

    it("applies fallback series options when empty series object is provided", () => {
      const { result } = renderHook(() =>
        useChart("FallbackLabel", {
          sets: 1,
          series: [{}],
        }),
      );

      const seriesOption = result.current.props.options.series?.[1];
      expect(seriesOption?.label).toBe("FallbackLabel");
      expect(seriesOption?.stroke).toBeDefined();
      expect(seriesOption?.fill).toBeDefined();
    });

    it("push appends new values, handles missing indices, and non-number types", () => {
      const { result } = renderHook(() => useChart("CPU", { sets: 2 }));

      act(() => {
        result.current.push(42.567);
      });

      const series1 = result.current.props.data[1];
      expect(series1[series1.length - 1]).toBe(42.57);
      // second series is missing in input, should default to 0
      const series2 = result.current.props.data[2];
      expect(series2[series2.length - 1]).toBe(0);

      // Push non-number or null
      act(() => {
        result.current.push(["not-a-number" as any, null]);
      });
      expect(result.current.props.data[1][19]).toBe(0);
      expect(result.current.props.data[2][19]).toBe(0);
    });

    it("push works with multiple series sets", () => {
      const { result } = renderHook(() => useChart("Network", { sets: 2 }));

      act(() => {
        result.current.push([10.2, 20.4]);
      });

      expect(result.current.props.data[1][19]).toBe(10.2);
      expect(result.current.props.data[2][19]).toBe(20.4);
    });

    it("clear resets all series back to 0", () => {
      const { result } = renderHook(() => useChart("CPU", { sets: 1 }));

      act(() => {
        result.current.push(99);
      });
      expect(result.current.props.data[1][19]).toBe(99);

      act(() => {
        result.current.clear();
      });
      expect(result.current.props.data[1][19]).toBe(0);
    });
  });

  describe("useChartTickLabel", () => {
    it("formats ticks with roundTo defined", () => {
      const { result } = renderHook(() =>
        useChartTickLabel("CPU", 100, "%", 2),
      );
      const axisValuesFn = result.current.props.options.axes?.[1].values as any;
      expect(axisValuesFn(null, [12.3456])).toEqual(["12.35%"]);
    });

    it("formats ticks with roundTo undefined", () => {
      const { result } = renderHook(() =>
        useChartTickLabel("Memory", 1024, "MiB"),
      );
      const axisValuesFn = result.current.props.options.axes?.[1].values as any;
      expect(axisValuesFn(null, [512.8])).toEqual(["513MiB"]);
    });
  });
});
