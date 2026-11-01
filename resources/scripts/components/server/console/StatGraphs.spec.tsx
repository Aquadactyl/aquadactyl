import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, act } from "@testing-library/react";
import StatGraphs from "./StatGraphs";
import { SocketEvent } from "@/components/server/events";

const mockCpuPush = vi.fn();
const mockCpuClear = vi.fn();
const mockMemPush = vi.fn();
const mockMemClear = vi.fn();
const mockNetPush = vi.fn();
const mockNetClear = vi.fn();

vi.mock("@/components/server/console/chart", () => ({
  primaryChartStyle: { stroke: "#fff", fill: "#fff" },
  UPlotChart: ({ options }: any) => (
    <div data-testid="uplot-chart" data-height={options?.height} />
  ),
  useChart: (_label: string, options: any) => {
    options?.formatTick?.(1024);
    return {
      props: { options: { height: 160 }, data: [] },
      push: mockNetPush,
      clear: mockNetClear,
    };
  },
  useChartTickLabel: (label: string) => {
    if (label === "CPU") {
      return {
        props: { options: { height: 160 }, data: [] },
        push: mockCpuPush,
        clear: mockCpuClear,
      };
    }
    return {
      props: { options: { height: 160 }, data: [] },
      push: mockMemPush,
      clear: mockMemClear,
    };
  },
}));

let websocketCallbacks: Record<string, (data: string) => void> = {};
vi.mock("@/plugins/useWebsocketEvent", () => ({
  default: (event: string, callback: (data: string) => void) => {
    websocketCallbacks[event] = callback;
  },
}));

let mockServerStatus = "running";
vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        status: { value: mockServerStatus },
        server: {
          data: {
            limits: { cpu: 200, memory: 2048 },
          },
        },
      }),
  },
}));

vi.mock("@/components/elements/tooltip/Tooltip", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

describe("components/server/console/StatGraphs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    websocketCallbacks = {};
    mockServerStatus = "running";
  });

  it("renders chart blocks for CPU, Memory, and Network", () => {
    const { getByText, getAllByTestId } = render(<StatGraphs />);

    expect(getByText("CPU Load")).toBeDefined();
    expect(getByText("Memory")).toBeDefined();
    expect(getByText("Network")).toBeDefined();
    expect(getAllByTestId("uplot-chart")).toHaveLength(3);
  });

  it("clears charts when server status becomes offline", () => {
    mockServerStatus = "offline";
    render(<StatGraphs />);

    expect(mockCpuClear).toHaveBeenCalled();
    expect(mockMemClear).toHaveBeenCalled();
    expect(mockNetClear).toHaveBeenCalled();
  });

  it("processes websocket stats events and pushes to charts", () => {
    render(<StatGraphs />);

    expect(websocketCallbacks[SocketEvent.STATS]).toBeDefined();

    const statsPayload1 = JSON.stringify({
      cpu_absolute: 45.2,
      memory_bytes: 512 * 1024 * 1024,
      network: { tx_bytes: 1000, rx_bytes: 2000 },
    });

    act(() => {
      websocketCallbacks[SocketEvent.STATS](statsPayload1);
    });

    expect(mockCpuPush).toHaveBeenCalledWith(45.2);
    expect(mockMemPush).toHaveBeenCalledWith(512);
    // Initial previous was -1, so network push starts with 0
    expect(mockNetPush).toHaveBeenCalledWith([0, 0]);

    // Second packet calculates deltas
    const statsPayload2 = JSON.stringify({
      cpu_absolute: 60.1,
      memory_bytes: 600 * 1024 * 1024,
      network: { tx_bytes: 1500, rx_bytes: 2800 },
    });

    act(() => {
      websocketCallbacks[SocketEvent.STATS](statsPayload2);
    });

    expect(mockCpuPush).toHaveBeenCalledWith(60.1);
    expect(mockMemPush).toHaveBeenCalledWith(600);
    expect(mockNetPush).toHaveBeenCalledWith([500, 800]);
  });

  it("ignores invalid JSON in websocket stats event", () => {
    render(<StatGraphs />);

    act(() => {
      websocketCallbacks[SocketEvent.STATS]("invalid json{{{");
    });

    expect(mockCpuPush).not.toHaveBeenCalled();
    expect(mockMemPush).not.toHaveBeenCalled();
    expect(mockNetPush).not.toHaveBeenCalled();
  });
});
