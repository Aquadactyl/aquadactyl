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
  useUserQueryKey: (keys: any[]) => keys.join(":"),
}));
vi.mock("@/lib/queryClient", () => ({
  useTanStackQuery: (_key: any, fn: any) => ({
    queryKey: _key,
    queryFn: fn,
  }),
}));

describe("api/account/activity", () => {
  it("queries account activity with default empty filters", async () => {
    vi.mocked(http.get).mockResolvedValueOnce({
      data: {
        object: "list",
        data: [
          {
            attributes: {
              id: "1",
              batch: null,
              event: "server:power.start",
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
          available_events: ["server:power.start"],
        },
      },
    } as any);

    const { result } = renderHook(() => useActivityLogs());
    expect((result.current as any).queryKey).toEqual(["account:activity:{}"]);

    const queryRes = await (result.current as any).queryFn();
    expect(http.get).toHaveBeenCalledWith("/api/client/account/activity", {
      params: {
        include: ["actor"],
      },
    });
    expect(queryRes.items.length).toBe(1);
    expect(queryRes.items[0].id).toBe("1");
    expect(queryRes.availableEvents).toEqual(["server:power.start"]);
  });

  it("queries account activity with custom filters", async () => {
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
        { page: 2, filters: { event: "auth:success" } },
        { enabled: true },
      ),
    );

    const queryRes = await (result.current as any).queryFn();
    expect(http.get).toHaveBeenCalledWith("/api/client/account/activity", {
      params: {
        page: 2,
        "filter[event]": "auth:success",
        include: ["actor"],
      },
    });
    expect(queryRes.items).toEqual([]);
    expect(queryRes.availableEvents).toEqual([]);
  });
});
