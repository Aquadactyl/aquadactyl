import { describe, it, expect, vi } from "vitest";
import useFileManagerQuery, {
  getDirectoryQueryKey,
  getDirectorySwrKey,
} from "./useFileManagerQuery";
import useFileManagerSwr, {
  getDirectoryQueryKey as getDirectoryQueryKeySwr,
  getDirectorySwrKey as getDirectorySwrKeySwr,
} from "./useFileManagerSwr";
import { renderHook } from "@testing-library/react";
import loadDirectory from "@/api/server/files/loadDirectory";

vi.mock("@/api/server/files/loadDirectory", () => ({
  default: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/queryClient", () => ({
  useTanStackQuery: vi.fn((key: string[], fn: () => any, opts: any) => {
    fn();
    return { data: [], key, opts };
  }),
}));

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: { data: { uuid: "server-uuid-123" } },
        files: { directory: "/mods" },
      }),
  },
}));

describe("plugins/useFileManagerQuery and useFileManagerSwr", () => {
  it("generates directory query and swr keys correctly", () => {
    const key1 = getDirectoryQueryKey("uuid-1", "/test");
    expect(key1).toEqual(["uuid-1", "files", "/test"]);

    const key2 = getDirectorySwrKey("uuid-2", "/dir");
    expect(key2).toEqual(["uuid-2", "files", "/dir"]);

    expect(getDirectoryQueryKeySwr).toBe(getDirectoryQueryKey);
    expect(getDirectorySwrKeySwr).toBe(getDirectorySwrKey);
    expect(useFileManagerSwr).toBe(useFileManagerQuery);
  });

  it("calls useTanStackQuery with proper query key and fetcher", () => {
    const { result } = renderHook(() => useFileManagerQuery());
    expect((result.current as any).key).toEqual([
      "server-uuid-123",
      "files",
      "/mods",
    ]);
    expect((result.current as any).opts).toEqual({ retry: 2 });
    expect(loadDirectory).toHaveBeenCalledWith("server-uuid-123", "/mods");
  });
});
