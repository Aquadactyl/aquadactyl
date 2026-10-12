import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ServerActivityLogContainer from "./ServerActivityLogContainer";

const mockMutate = vi.fn();
const mockClearAndAddHttpError = vi.fn();
let mockData: any = null;
let mockError: any = null;

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: {
          data: { uuid: "server-uuid-123" },
        },
      }),
  },
}));

vi.mock("@/plugins/useFlash", () => ({
  useFlashKey: () => ({
    clearAndAddHttpError: mockClearAndAddHttpError,
  }),
}));

vi.mock("@/api/server/activity", () => ({
  useActivityLogs: () => ({
    data: mockData,
    isValidating: false,
    error: mockError,
    mutate: mockMutate,
  }),
}));

vi.mock("@/components/elements/activity/useActivityLogFilters", () => ({
  default: () => ({
    filters: {},
    page: 1,
    setPage: vi.fn(),
  }),
}));

vi.mock("@/components/elements/ServerContentBlock", () => ({
  default: ({ title, children }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/components/FlashMessageRender", () => ({
  default: () => <div data-testid="flash-render" />,
}));

vi.mock("@/components/elements/activity/ActivityLogList", () => ({
  default: ({ title, onRefresh }: any) => (
    <div>
      <h2>{title}</h2>
      <button onClick={onRefresh}>Refresh</button>
    </div>
  ),
}));

describe("components/server/ServerActivityLogContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = { items: [] };
    mockError = null;
  });

  it("renders server activity container and handles refresh", () => {
    render(<ServerActivityLogContainer />);

    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getByText("Server activity")).toBeTruthy();

    fireEvent.click(screen.getByText("Refresh"));
    expect(mockMutate).toHaveBeenCalled();
  });

  it("handles error in activity log loading", () => {
    mockError = new Error("Network error");
    render(<ServerActivityLogContainer />);

    expect(mockClearAndAddHttpError).toHaveBeenCalledWith(mockError);
  });
});
