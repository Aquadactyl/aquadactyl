import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ActivityLogContainer from "./ActivityLogContainer";

const mockMutate = vi.fn();
const mockClearAndAddHttpError = vi.fn();
let mockData: any = null;
let mockError: any = null;

vi.mock("@/plugins/useFlash", () => ({
  useFlashKey: () => ({
    clearAndAddHttpError: mockClearAndAddHttpError,
  }),
}));

vi.mock("@/api/account/activity", () => ({
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

vi.mock("@/components/elements/PageContentBlock", () => ({
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
  default: ({ title, children, onRefresh }: any) => (
    <div>
      <h2>{title}</h2>
      <button onClick={onRefresh}>Refresh</button>
      <div data-testid="log-items">
        {children?.({
          properties: { useragent: "Mozilla/5.0" },
        })}
      </div>
    </div>
  ),
}));

vi.mock("@/components/elements/tooltip/Tooltip", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

describe("components/dashboard/activity/ActivityLogContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = { items: [] };
    mockError = null;
  });

  it("renders container, useragent tooltip icon, and triggers refresh", () => {
    render(<ActivityLogContainer />);

    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getByLabelText("Browser details")).toBeTruthy();

    fireEvent.click(screen.getByText("Refresh"));
    expect(mockMutate).toHaveBeenCalled();
  });

  it("flashes error when error occurs", () => {
    mockError = new Error("Failed to load logs");
    render(<ActivityLogContainer />);

    expect(mockClearAndAddHttpError).toHaveBeenCalledWith(mockError);
  });
});
