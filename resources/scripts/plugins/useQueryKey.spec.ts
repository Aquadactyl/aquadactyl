import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import useQueryContextKey, {
  useServerQueryKey,
  useUserQueryKey,
  useSWRKey,
  useServerSWRKey,
  useUserSWRKey,
} from "./useQueryKey";
import swrKeyDefault, {
  useServerQueryKey as swrServerKey,
  useUserQueryKey as swrUserKey,
  useSWRKey as swrSWRKey,
  useServerSWRKey as swrServerSWRKey,
  useUserSWRKey as swrUserSWRKey,
} from "./useSWRKey";

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: {
          data: { uuid: "server-uuid-abc" },
        },
      }),
  },
}));

vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      user: {
        data: { uuid: "user-uuid-xyz" },
      },
    }),
}));

describe("plugins/useQueryKey", () => {
  it("formats single context key with and without prefix", () => {
    const { result: withoutPrefix } = renderHook(() =>
      useQueryContextKey("single-key"),
    );
    expect(withoutPrefix.current).toBe('query::"single-key"');

    const { result: withPrefix } = renderHook(() =>
      useQueryContextKey("single-key", "custom-prefix"),
    );
    expect(withPrefix.current).toBe('query::custom-prefix:"single-key"');
  });

  it("formats array context keys", () => {
    const { result } = renderHook(() =>
      useQueryContextKey(["item-1", 42, { filter: true }]),
    );
    expect(result.current).toBe('query::"item-1":42:{"filter":true}');
  });

  it("throws error when empty context key is provided", () => {
    expect(() => {
      renderHook(() => useQueryContextKey([]));
    }).toThrow('Must provide a valid context key to "useQueryContextKey".');
  });

  it("formats server query key using ServerContext", () => {
    const { result } = renderHook(() => useServerQueryKey("files"));
    expect(result.current).toBe('query::server:server-uuid-abc:"files"');
  });

  it("formats user query key using useAppStore", () => {
    const { result } = renderHook(() => useUserQueryKey("profile"));
    expect(result.current).toBe('query::user:user-uuid-xyz:"profile"');
  });

  it("exports backward compatible SWR aliases", () => {
    expect(useSWRKey).toBe(useQueryContextKey);
    expect(useServerSWRKey).toBe(useServerQueryKey);
    expect(useUserSWRKey).toBe(useUserQueryKey);

    // Verify useSWRKey re-export module
    expect(swrKeyDefault).toBe(useQueryContextKey);
    expect(swrServerKey).toBe(useServerQueryKey);
    expect(swrUserKey).toBe(useUserQueryKey);
    expect(swrSWRKey).toBe(useQueryContextKey);
    expect(swrServerSWRKey).toBe(useServerQueryKey);
    expect(swrUserSWRKey).toBe(useUserQueryKey);
  });
});
