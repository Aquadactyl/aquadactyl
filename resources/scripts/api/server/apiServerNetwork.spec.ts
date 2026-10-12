import { describe, it, expect, vi, beforeEach } from "vitest";
import http from "@/api/http";
import createServerAllocation from "./network/createServerAllocation";
import deleteServerAllocation from "./network/deleteServerAllocation";
import setPrimaryServerAllocation from "./network/setPrimaryServerAllocation";
import setServerAllocationNotes from "./network/setServerAllocationNotes";
import getServerAllocations from "./network/getServerAllocations";
import { renderHook } from "@testing-library/react";

vi.mock("@/api/http");

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({ server: { data: { uuid: "srv-net-1" } } }),
  },
}));

let capturedQueryFn: (() => Promise<any>) | null = null;
vi.mock("@/lib/queryClient", () => ({
  useTanStackQuery: (_key: any, queryFn: () => Promise<any>) => {
    capturedQueryFn = queryFn;
    return { data: undefined, error: null };
  },
}));

describe("api/server/network", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedQueryFn = null;
  });

  const mockAllocationRaw = {
    object: "server_allocation",
    attributes: {
      id: 10,
      ip: "192.168.1.1",
      alias: "node.example.com",
      port: 25565,
      notes: "Main port",
      is_default: true,
    },
  };

  it("createServerAllocation posts request and returns transformed allocation", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({
      data: mockAllocationRaw,
    } as any);

    const result = await createServerAllocation("srv-net-1");

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-net-1/network/allocations",
    );
    expect(result.id).toBe(10);
    expect(result.ip).toBe("192.168.1.1");
    expect(result.port).toBe(25565);
    expect(result.isDefault).toBe(true);
  });

  it("deleteServerAllocation sends DELETE request", async () => {
    vi.mocked(http.delete).mockResolvedValueOnce({} as any);

    await deleteServerAllocation("srv-net-1", 10);

    expect(http.delete).toHaveBeenCalledWith(
      "/api/client/servers/srv-net-1/network/allocations/10",
    );
  });

  it("setPrimaryServerAllocation posts to primary endpoint and returns allocation", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({
      data: mockAllocationRaw,
    } as any);

    const result = await setPrimaryServerAllocation("srv-net-1", 10);

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-net-1/network/allocations/10/primary",
    );
    expect(result.id).toBe(10);
  });

  it("setServerAllocationNotes posts notes updates and returns allocation", async () => {
    vi.mocked(http.post).mockResolvedValueOnce({
      data: {
        ...mockAllocationRaw,
        attributes: { ...mockAllocationRaw.attributes, notes: "Updated note" },
      },
    } as any);

    const result = await setServerAllocationNotes(
      "srv-net-1",
      10,
      "Updated note",
    );

    expect(http.post).toHaveBeenCalledWith(
      "/api/client/servers/srv-net-1/network/allocations/10",
      { notes: "Updated note" },
    );
    expect(result.notes).toBe("Updated note");
  });

  it("getServerAllocations query hook fetches and transforms allocations list", async () => {
    renderHook(() => getServerAllocations());

    expect(capturedQueryFn).not.toBeNull();

    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        data: [mockAllocationRaw],
      },
    } as any);

    const allocations = await capturedQueryFn!();

    expect(http.get).toHaveBeenCalledWith(
      "/api/client/servers/srv-net-1/network/allocations",
    );
    expect(allocations).toHaveLength(1);
    expect(allocations[0].id).toBe(10);

    // Fallback when data.data is missing
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {},
    } as any);
    const emptyAllocations = await capturedQueryFn!();
    expect(emptyAllocations).toEqual([]);
  });
});
