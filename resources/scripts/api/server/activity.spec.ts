import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useActivityLogs } from "./activity";
import http from "@/api/http";

vi.mock("@/api/http", async () => {
  const actual = await vi.importActual<any>("@/api/http");
  return {
    ...actual,
    default: {
      get: vi.fn(),
    },
  };
});

vi.mock("@/plugins/useQueryKey", () => ({
  useServerQueryKey: (keys: any[]) => keys.join(":"),
}));
vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({ server: { data: { uuid: "server-uuid-123" } } }),
  },
}));
vi.mock("@/lib/queryClient", () => ({
  useTanStackQuery: (_key: any, fn: any) => ({
    queryKey: _key,
    queryFn: fn,
  }),
}));

describe("api/server/activity", () => {
  it("queries server activity with default empty filters", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        object: "list",
        data: [
          {
            attributes: {
              id: "server-act-1",
              batch: null,
              event: "server:backup.create",
              is_api: false,
              ip: "127.0.0.1",
              description: null,
              timestamp: "2026-10-12T00:00:00Z",
              has_metadata: false,
              data: {},
            },
          },
        ],
        meta: {
          pagination: {
            total: 1,
            count: 1,
            per_page: 25,
            current_page: 1,
            total_pages: 1,
          },
          available_events: ["server:backup.create"],
        },
      },
    } as any);

    const { result } = renderHook(() => useActivityLogs());
    expect((result.current as any).queryKey).toBeDefined();

    const queryRes = await (result.current as any).queryFn();
    expect(http.get).toHaveBeenCalledWith(
      "/api/client/servers/server-uuid-123/activity",
      {
        params: {
          include: ["actor"],
        },
      },
    );
    expect(queryRes.items[0].id).toBe("server-act-1");
    expect(queryRes.availableEvents).toEqual(["server:backup.create"]);
  });

  it("queries server activity with filters", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        object: "list",
        data: [],
        meta: {
          pagination: {
            total: 0,
            count: 0,
            per_page: 25,
            current_page: 1,
            total_pages: 1,
          },
        },
      },
    } as any);

    const { result } = renderHook(() =>
      useActivityLogs(
        { page: 3, filters: { ip: "10.0.0.1" } },
        { retry: false },
      ),
    );

    const queryRes = await (result.current as any).queryFn();
    expect(http.get).toHaveBeenCalledWith(
      "/api/client/servers/server-uuid-123/activity",
      {
        params: {
          page: 3,
          "filter[ip]": "10.0.0.1",
          include: ["actor"],
        },
      },
    );
    expect(queryRes.items).toEqual([]);
    expect(queryRes.availableEvents).toEqual([]);
  });
});
