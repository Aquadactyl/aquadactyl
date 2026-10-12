import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useActivityLogFilters from "./useActivityLogFilters";

const mockNavigate = vi.fn();
let mockLocation: any = { pathname: "/activity", hash: "" };
let mockHashData: Record<string, string | undefined> = {};

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

vi.mock("@/plugins/useLocationHash", () => ({
  default: () => ({
    hash: mockHashData,
    pathTo: (params: Record<string, any>) =>
      new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined),
      ).toString(),
  }),
}));

describe("useActivityLogFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = { pathname: "/activity", hash: "" };
    mockHashData = {};
  });

  it("returns default filters when hash is empty", () => {
    const { result } = renderHook(() => useActivityLogFilters());

    expect(result.current.filters.page).toBe(1);
    expect(result.current.filters.sorts!.timestamp).toBe(-1);
    expect(result.current.hasFilters).toBe(false);
  });

  it("parses valid positive page number", () => {
    mockHashData = { page: "5" };
    const { result } = renderHook(() => useActivityLogFilters());

    expect(result.current.filters.page).toBe(5);
  });

  it("normalizes page number 0 to 1", () => {
    mockHashData = { page: "0" };
    const { result } = renderHook(() => useActivityLogFilters());

    expect(result.current.filters.page).toBe(1);
  });

  it("handles non-numeric page string", () => {
    mockHashData = { page: "invalid" };
    const { result } = renderHook(() => useActivityLogFilters());

    expect(result.current.filters.page).toBe(1);
  });

  it("handles oldest sort order", () => {
    mockHashData = { sort: "oldest" };
    const { result } = renderHook(() => useActivityLogFilters());

    expect(result.current.filters.sorts!.timestamp).toBe(1);
    expect(result.current.hasFilters).toBe(true);
  });

  it("identifies hasFilters for different filter params", () => {
    const params = ["event", "event_exact", "ip", "period", "source"] as const;
    for (const param of params) {
      mockHashData = { [param]: "value" };
      const { result } = renderHook(() => useActivityLogFilters());
      expect(result.current.hasFilters).toBe(true);
      expect(result.current.filters.filters![param]).toBe("value");
    }
  });

  it("updates hash and resets page by default", () => {
    mockHashData = { page: "3" };
    const { result } = renderHook(() => useActivityLogFilters());

    act(() => {
      result.current.update({ ip: "127.0.0.1" });
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/activity",
        hash: "ip=127.0.0.1",
      }),
    );
  });

  it("updates hash without resetting page when resetPage is false", () => {
    mockHashData = { page: "3" };
    const { result } = renderHook(() => useActivityLogFilters());

    act(() => {
      result.current.update({ page: "3", ip: "127.0.0.1" }, false);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/activity",
        hash: expect.stringContaining("page=3"),
      }),
    );
  });

  it("clears hash when clear is called", () => {
    const { result } = renderHook(() => useActivityLogFilters());

    act(() => {
      result.current.clear();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/activity",
        hash: "",
      }),
    );
  });
});
