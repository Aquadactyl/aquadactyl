import React, { useEffect } from "react";
import { act, cleanup, render } from "@testing-library/react";
import type uPlot from "uplot";
import StatGraphs from "./StatGraphs";
import { ServerContext } from "@/state/server";

const charts = vi.hoisted(() => ({
  instances: [] as { options: uPlot.Options; data: number[][] }[],
}));
vi.mock("uplot", () => ({
  default: class {
    constructor(
      public options: uPlot.Options,
      public data: number[][],
    ) {
      charts.instances.push(this);
    }
    setData(data: number[][]) {
      this.data = data;
    }
    setSize() {}
    destroy() {}
  },
}));

let statsCallback: (data: string) => void;
vi.mock("@/plugins/useWebsocketEvent", () => ({
  default: (_event: string, callback: (data: string) => void) => {
    statsCallback = callback;
  },
}));

const Fixture = () => {
  const ready = ServerContext.useStoreState((state) => !!state.server.data);
  const setServer = ServerContext.useStoreActions(
    (actions) => actions.server.setServer,
  );
  const setStatus = ServerContext.useStoreActions(
    (actions) => actions.status.setServerStatus,
  );
  useEffect(() => {
    setServer({ limits: { cpu: 200, memory: 2048 } } as any);
    setStatus("running");
  }, []);
  return ready ? <StatGraphs /> : null;
};

const colour = (value: uPlot.Series.Stroke | uPlot.Series.Fill | undefined) =>
  typeof value === "function" ? value({} as uPlot, 1) : value;

beforeEach(() => {
  charts.instances = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  document.documentElement.style.setProperty("--color-primary-400", "#c08af7");
  document.documentElement.style.setProperty("--color-primary-700", "#7640ab");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("style");
});

it("colours CPU, memory and outbound from the current palette without recreating charts", () => {
  render(
    <ServerContext.Provider>
      <Fixture />
    </ServerContext.Provider>,
  );
  expect(charts.instances).toHaveLength(3);
  const lines = charts.instances.map((chart) => chart.options.series[1]);
  expect(lines.map((line) => line.label)).toEqual([
    "CPU",
    "Memory",
    "Network Out",
  ]);
  for (const line of lines) {
    expect(colour(line.stroke)).toBe("#c08af7");
    expect(colour(line.fill)).toBe("rgba(118, 64, 171, 0.5)");
  }
  expect(colour(charts.instances[2].options.series[2].stroke)).toBe("#facc15");
  document.documentElement.style.setProperty("--color-primary-400", "#55aaff");
  document.documentElement.style.setProperty("--color-primary-700", "#112244");
  act(() =>
    statsCallback(
      JSON.stringify({
        cpu_absolute: 10,
        memory_bytes: 1024,
        network: { tx_bytes: 100, rx_bytes: 200 },
      }),
    ),
  );
  expect(charts.instances).toHaveLength(3);
  for (const line of lines) {
    expect(colour(line.stroke)).toBe("#55aaff");
    expect(colour(line.fill)).toBe("rgba(17, 34, 68, 0.5)");
  }
});

it("plots transmitted bytes as outbound and received bytes as inbound", () => {
  render(
    <ServerContext.Provider>
      <Fixture />
    </ServerContext.Provider>,
  );
  act(() =>
    statsCallback(
      JSON.stringify({
        cpu_absolute: 5,
        memory_bytes: 1024,
        network: { tx_bytes: 1000, rx_bytes: 2000 },
      }),
    ),
  );
  act(() =>
    statsCallback(
      JSON.stringify({
        cpu_absolute: 15,
        memory_bytes: 2097152,
        network: { tx_bytes: 4000, rx_bytes: 7000 },
      }),
    ),
  );
  const network = charts.instances[2];
  expect(network.options.series.slice(1).map((line) => line.label)).toEqual([
    "Network Out",
    "Network In",
  ]);
  expect(network.data[1].at(-1)).toBe(3000);
  expect(network.data[2].at(-1)).toBe(5000);
  expect(charts.instances[0].data[1].at(-1)).toBe(15);
  expect(charts.instances[1].data[1].at(-1)).toBe(2);
});
