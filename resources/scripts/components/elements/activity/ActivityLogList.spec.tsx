import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ActivityLogList from "./ActivityLogList";
import { MemoryRouter } from "react-router";

vi.mock("./ActivityLogFilters", () => ({
  default: () => <div data-testid="filters">Filters</div>,
}));

vi.mock("./ActivityLogEntry", () => ({
  default: ({ activity, children }: any) => (
    <div data-testid="entry">
      <span>{activity.event}</span>
      {children}
    </div>
  ),
}));

vi.mock("@/components/elements/Spinner", () => ({
  default: () => <span data-testid="spinner" />,
}));

vi.mock("@/components/elements/table/PaginationFooter", () => ({
  default: () => <div data-testid="pagination">Pagination</div>,
}));

const mockControls = {
  hash: "",
  hasFilters: false,
  update: vi.fn(),
  clear: vi.fn(),
};

const mockData = {
  items: [
    {
      id: "act-1",
      event: "server:power.start",
      timestamp: new Date(),
      properties: {},
      relationships: {},
    } as any,
  ],
  availableEvents: ["server:power.start", "server:power.stop"],
  pagination: {
    total: 1,
    count: 1,
    perPage: 10,
    currentPage: 1,
    totalPages: 1,
  },
};

describe("components/elements/activity/ActivityLogList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (
    props: Partial<React.ComponentProps<typeof ActivityLogList>> = {},
  ) =>
    render(
      <MemoryRouter>
        <ActivityLogList
          title="Server Activity"
          description="Track server operations"
          scope="Server"
          data={mockData}
          isValidating={false}
          hasError={false}
          controls={mockControls as any}
          onRefresh={vi.fn()}
          {...props}
        />
      </MemoryRouter>,
    );

  it("renders heading, filters, entries, and pagination when data is available", () => {
    renderComponent();

    expect(screen.getByText("Server Activity")).toBeDefined();
    expect(screen.getByText("Server")).toBeDefined();
    expect(screen.getByText("server:power.start")).toBeDefined();
    expect(screen.getByTestId("pagination")).toBeDefined();
  });

  it("shows spinner when data is loading and no error", () => {
    renderComponent({ data: undefined, isValidating: true });

    expect(screen.getByTestId("spinner")).toBeDefined();
    expect(screen.getByText("Loading activity…")).toBeDefined();
  });

  it("shows error empty state when hasError is true and no data", () => {
    renderComponent({ data: undefined, hasError: true });

    expect(screen.getByText("Activity could not be loaded")).toBeDefined();
    expect(screen.getByText("Unable to load activity")).toBeDefined();
  });

  it("shows no activity yet when list is empty without filters", () => {
    renderComponent({
      data: {
        ...mockData,
        items: [],
        pagination: { ...mockData.pagination, total: 0 },
      },
    });

    expect(screen.getByText("No activity yet")).toBeDefined();
  });

  it("shows no matching activity and clear filters button when filters applied", () => {
    renderComponent({
      data: {
        ...mockData,
        items: [],
        pagination: { ...mockData.pagination, total: 0 },
      },
      controls: { ...mockControls, hasFilters: true } as any,
    });

    expect(screen.getByText("No matching activity")).toBeDefined();
    const clearBtn = screen.getByRole("button", { name: "Clear filters" });
    fireEvent.click(clearBtn);
    expect(mockControls.clear).toHaveBeenCalled();
  });

  it("calls onRefresh when refresh button clicked", () => {
    const onRefresh = vi.fn();
    renderComponent({ onRefresh });

    fireEvent.click(screen.getByRole("button", { name: /Refresh/i }));
    expect(onRefresh).toHaveBeenCalled();
  });
});
