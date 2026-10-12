import React, { useEffect, useMemo, useRef, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { theme } from "@/lib/theme";
import { hexToRgba } from "@/lib/helpers";
import clsx from "clsx";

export interface UPlotChartProps {
  options: uPlot.Options;
  data: uPlot.AlignedData | number[][];
  className?: string;
}

export function UPlotChart({ options, data, className }: UPlotChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);
  const height = (options.height as number) || 160;

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.setData(data as uPlot.AlignedData);
    }
  }, [data]);

  useEffect(() => {
    const el = containerRef.current!;
    const width = el.clientWidth || 300;
    const chart = new uPlot(
      { ...options, width, height },
      data as uPlot.AlignedData,
      el,
    );
    chartRef.current = chart;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0 && chartRef.current) {
          chartRef.current.setSize({
            width: Math.floor(w),
            height,
          });
        }
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={clsx("w-full overflow-hidden", className)}
      style={{ height, minHeight: height }}
    />
  );
}

export interface UseChartSeriesOption {
  label?: string;
  stroke?: uPlot.Series.Stroke;
  fill?: uPlot.Series.Fill;
}

// Canvas cannot resolve CSS variables itself. Resolve the current palette on
// each draw so colour changes do not require recreating the charts.
export const primaryChartStyle = {
  stroke: () => theme("colors.primary.400"),
  fill: () => hexToRgba(theme("colors.primary.700"), 0.5),
};

export interface UseChartOptions {
  sets?: number;
  suggestedMax?: number;
  formatTick?: (value: number) => string;
  series?: UseChartSeriesOption[];
}

const X_SERIES = Array.from({ length: 20 }, (_, i) => i);

export function useChart(label: string, opts?: UseChartOptions) {
  const sets = opts?.sets || 1;
  const suggestedMax = opts?.suggestedMax;
  const formatTick = opts?.formatTick;
  const seriesProp = opts?.series;

  const [data, setData] = useState<number[][]>(() => [
    X_SERIES,
    ...Array.from({ length: sets }, () => Array(20).fill(0)),
  ]);

  const series = useMemo(() => {
    if (seriesProp && seriesProp.length > 0) return seriesProp;
    return [
      {
        label,
        ...primaryChartStyle,
      },
    ];
  }, [label, seriesProp]);

  const options = useMemo<uPlot.Options>(() => {
    return {
      width: 300,
      height: 160,
      legend: { show: false },
      cursor: { show: false },
      padding: [10, 10, 10, 0],
      scales: {
        x: { time: false },
        y: {
          range: (u, min, max) => [
            0,
            Math.max(suggestedMax || 0, max > 0 ? max : 1),
          ],
        },
      },
      axes: [
        { show: false },
        {
          show: true,
          stroke: theme("colors.gray.200"),
          grid: {
            stroke: theme("colors.gray.700"),
            width: 1,
          },
          ticks: { show: false },
          size: 55,
          font: `11px ${theme("fontFamily.sans")}`,
          values: (u, splits) =>
            splits.map((val) => (formatTick ? formatTick(val) : String(val))),
        },
      ],
      series: [
        {},
        ...series.map((s) => ({
          label: s.label || label,
          stroke: s.stroke ?? primaryChartStyle.stroke,
          fill: s.fill ?? primaryChartStyle.fill,
          width: 1.5,
          points: { show: false },
        })),
      ],
    };
  }, [label, suggestedMax, formatTick, series]);

  const push = React.useCallback((items: number | null | (number | null)[]) => {
    const list = Array.isArray(items) ? items : [items];
    setData((prev) => {
      const nextSeries = prev.slice(1).map((arr, idx) => {
        const val = list[idx] ?? 0;
        const num = typeof val === "number" ? Number(val.toFixed(2)) : 0;
        return [...arr.slice(1), num];
      });
      return [prev[0], ...nextSeries];
    });
  }, []);

  const clear = React.useCallback(() => {
    setData([
      X_SERIES,
      ...Array.from({ length: sets }, () => Array(20).fill(0)),
    ]);
  }, [sets]);

  return {
    props: { data, options },
    push,
    clear,
  };
}

export function useChartTickLabel(
  label: string,
  max: number,
  tickLabel: string,
  roundTo?: number,
) {
  return useChart(label, {
    sets: 1,
    suggestedMax: max,
    formatTick: (value) =>
      `${roundTo !== undefined ? Number(value).toFixed(roundTo) : Math.round(value)}${tickLabel}`,
  });
}
