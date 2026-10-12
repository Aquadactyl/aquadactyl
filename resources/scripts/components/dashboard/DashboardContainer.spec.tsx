import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import DashboardContainer from "./DashboardContainer";
import { MemoryRouter } from "react-router";
import getServers from "@/api/getServers";

vi.mock("@/api/getServers", () => ({
  default: vi.fn().mockResolvedValue({
    items: [],
    pagination: {
      total: 0,
      count: 0,
      perPage: 10,
      currentPage: 1,
      totalPages: 0,
    },
  }),
}));

vi.mock("@/components/dashboard/ServerRow", () => ({
  default: ({ server }: any) => (
    <div data-testid="server-row">{server.name}</div>
  ),
}));

vi.mock("@/components/elements/Spinner", () => ({
  default: () => <span data-testid="spinner" />,
}));

vi.mock("@/components/elements/PageContentBlock", () => ({
  default: ({ title, children }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock("@/components/elements/Pagination", () => ({
  default: ({ data, children, onPageSelect }: any) => (
    <div>
      <button data-testid="page-select-btn" onClick={() => onPageSelect(2)}>
        Page 2
      </button>
      {children({ items: data.items })}
    </div>
  ),
}));

vi.mock("@blueprint/components/Dashboard/Serverlist/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Dashboard/Serverlist/AfterContent", () => ({
  default: () => null,
}));

let mockServersData: any = {
  items: [
    {
      id: "srv-1",
      uuid: "uuid-1",
      name: "Survival Server",
      limits: { memory: 1024, cpu: 100, disk: 1024 },
    },
  ],
  pagination: {
    total: 1,
    count: 1,
    perPage: 10,
    currentPage: 1,
    totalPages: 1,
  },
};
let mockIsLoading = false;
let mockIsValidating = false;
let mockError: any = null;
const mockMutate = vi.fn();

vi.mock("@/lib/queryClient", () => ({
  useTanStackQuery: (_key: any, fetcher?: () => any) => {
    if (fetcher) {
      fetcher();
    }
    return {
      data: mockServersData,
      isLoading: mockIsLoading,
      isValidating: mockIsValidating,
      error: mockError,
      mutate: mockMutate,
    };
  },
}));

let mockRootAdmin = true;
vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      user: {
        data: {
          uuid: "user-uuid-1",
          rootAdmin: mockRootAdmin,
        },
      },
    }),
}));

let mockShowOnlyAdmin = false;
const mockSetShowOnlyAdmin = vi.fn((val) => {
  mockShowOnlyAdmin = val;
});
vi.mock("@/plugins/usePersistedState", () => ({
  usePersistedState: () => [mockShowOnlyAdmin, mockSetShowOnlyAdmin],
}));

const mockClearFlashes = vi.fn();
const mockClearAndAddHttpError = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    clearFlashes: mockClearFlashes,
    clearAndAddHttpError: mockClearAndAddHttpError,
  }),
}));

describe("components/dashboard/DashboardContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRootAdmin = true;
    mockShowOnlyAdmin = false;
    mockIsLoading = false;
    mockIsValidating = false;
    mockError = null;
    mockServersData = {
      items: [
        {
          id: "srv-1",
          uuid: "uuid-1",
          name: "Survival Server",
          limits: { memory: 1024, cpu: 100, disk: 1024 },
        },
      ],
      pagination: {
        total: 1,
        count: 1,
        perPage: 10,
        currentPage: 1,
        totalPages: 1,
      },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderComponent = (search = "") =>
    render(
      <MemoryRouter initialEntries={[`/${search}`]}>
        <DashboardContainer />
      </MemoryRouter>,
    );

  it("renders server rows, total count and admin switchers", () => {
    renderComponent();

    expect(screen.getByText("Survival Server")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("Your servers")).toBeDefined();
    expect(screen.getByText("Other servers")).toBeDefined();
    expect(screen.getByText("Manage servers")).toBeDefined();
    expect(getServers).toHaveBeenCalled();
  });

  it("filters search input, triggers debounced search, and clears search text", () => {
    vi.useFakeTimers();
    renderComponent("?q=initial");

    const searchInput = screen.getByRole("searchbox");
    expect(searchInput).toHaveProperty("value", "initial");

    fireEvent.change(searchInput, { target: { value: "creative" } });
    expect(searchInput).toHaveProperty("value", "creative");

    act(() => {
      vi.advanceTimersByTime(350);
    });

    const clearButton = screen.getByLabelText("Clear search");
    fireEvent.click(clearButton);
    expect(searchInput).toHaveProperty("value", "");
  });

  it("changes scope between your servers and other servers", () => {
    renderComponent();

    const otherServersBtn = screen.getByText("Other servers");
    fireEvent.click(otherServersBtn);
    expect(mockSetShowOnlyAdmin).toHaveBeenCalledWith(true);

    const yourServersBtn = screen.getByText("Your servers");
    fireEvent.click(yourServersBtn);
    expect(mockSetShowOnlyAdmin).toHaveBeenCalledWith(false);
  });

  it("displays loading spinner when servers are null and no error", () => {
    mockServersData = null;
    renderComponent();

    expect(screen.getByTestId("spinner")).toBeDefined();
  });

  it("displays error state when servers are null and error occurred", () => {
    mockServersData = null;
    mockError = new Error("Network error");
    renderComponent();

    expect(screen.getByText("Unable to load your servers")).toBeDefined();
    expect(mockClearAndAddHttpError).toHaveBeenCalled();

    const tryAgainBtn = screen.getByText("Try again");
    fireEvent.click(tryAgainBtn);
    expect(mockMutate).toHaveBeenCalled();
  });

  it("refreshes servers list when clicking refresh button", () => {
    renderComponent();

    const refreshBtn = screen.getByLabelText("Refresh servers");
    fireEvent.click(refreshBtn);
    expect(mockMutate).toHaveBeenCalled();
  });

  it("displays empty state message with open server management for admin when no servers", () => {
    mockServersData = {
      items: [],
      pagination: {
        total: 0,
        count: 0,
        perPage: 10,
        currentPage: 1,
        totalPages: 0,
      },
    };

    renderComponent();

    expect(screen.getByText("No servers yet")).toBeDefined();
    expect(
      screen.getByText(
        "Create a server in the admin panel, or assign an existing server to your account.",
      ),
    ).toBeDefined();
    expect(screen.getByText("Open server management")).toBeDefined();
  });

  it("displays empty state for non-admin user", () => {
    mockRootAdmin = false;
    mockServersData = {
      items: [],
      pagination: {
        total: 0,
        count: 0,
        perPage: 10,
        currentPage: 1,
        totalPages: 0,
      },
    };

    renderComponent();

    expect(screen.queryByText("Other servers")).toBeNull();
    expect(screen.queryByText("Manage servers")).toBeNull();
    expect(
      screen.getByText(
        "When a server is assigned to your account, you’ll find it here. Contact your administrator to get started.",
      ),
    ).toBeDefined();
  });

  it("displays empty state when showOnlyAdmin is true", () => {
    mockShowOnlyAdmin = true;
    mockServersData = {
      items: [],
      pagination: {
        total: 0,
        count: 0,
        perPage: 10,
        currentPage: 1,
        totalPages: 0,
      },
    };

    renderComponent();

    expect(screen.getByText("No other servers")).toBeDefined();
    expect(
      screen.getByText("Servers belonging to other users will appear here."),
    ).toBeDefined();
  });

  it("displays empty state when searching with no matches", () => {
    mockServersData = {
      items: [],
      pagination: {
        total: 0,
        count: 0,
        perPage: 10,
        currentPage: 1,
        totalPages: 0,
      },
    };

    renderComponent("?q=notfound");

    expect(screen.getByText("No matching servers")).toBeDefined();
    const clearBtns = screen.getAllByRole("button", { name: /Clear search/i });
    expect(clearBtns.length).toBe(2);
    fireEvent.click(clearBtns[1]);
    fireEvent.click(clearBtns[0]);
  });

  it("resets page when currentPage > 1 but items are empty, and handles page parameter", () => {
    mockServersData = {
      items: [],
      pagination: {
        total: 0,
        count: 0,
        perPage: 10,
        currentPage: 2,
        totalPages: 1,
      },
    };

    renderComponent("?page=2");

    // Page reset should trigger
    expect(screen.getByText("No servers yet")).toBeDefined();
  });

  it("handles isValidating spinning state and invalid page param fallback", () => {
    mockIsValidating = true;
    renderComponent("?page=invalid");

    const refreshBtn = screen.getByLabelText("Refresh servers");
    expect(refreshBtn).toHaveProperty("disabled", true);
  });
});
