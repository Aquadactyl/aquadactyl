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
  default: ({ server, folders }: any) => (
    <div
      data-testid="server-row"
      data-folders={folders === undefined ? "hidden" : "visible"}
    >
      {server.name}
    </div>
  ),
}));
vi.mock("@/api/serverFolders", () => ({
  getServerFolders: vi.fn().mockResolvedValue([]),
}));
vi.mock("./ServerFolderBar", () => ({
  default: ({ onSelect, onChange }: any) => (
    <>
      <button onClick={() => onSelect("1")}>Filter folder</button>
      <button onClick={() => onSelect("all")}>Filter all</button>
      <button onClick={onChange}>Refresh folders</button>
    </>
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
let mockFolderError: any = null;
let mockFoldersData: any = [];
const mockRefreshFolders = vi.fn().mockResolvedValue(undefined);
const mockMutate = vi.fn();
const mockFolderQuery = vi.fn();

vi.mock("@/lib/queryClient", () => ({
  useTanStackQuery: (_key: any, fetcher?: () => any) => {
    if (_key === null) {
      mockFolderQuery(null);
      return { data: undefined, error: null, mutate: mockRefreshFolders };
    }
    if (_key[0] === "/api/client/server-folders") {
      mockFolderQuery(_key);
      return {
        data: mockFoldersData,
        error: mockFolderError,
        mutate: mockRefreshFolders,
      };
    }
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
let mockSettings: any;
vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      settings: { data: mockSettings },
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
    mockSettings = undefined;
    mockShowOnlyAdmin = false;
    mockIsLoading = false;
    mockIsValidating = false;
    mockError = null;
    mockFolderError = null;
    mockFoldersData = [];
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

  it.each([
    undefined,
    {},
    { features: {} },
    { features: { serverFolders: true } },
  ])("keeps folders available by default and when enabled (%j)", (settings) => {
    mockSettings = settings;
    renderComponent();
    expect(screen.getByText("Filter folder")).toBeDefined();
    expect(mockFolderQuery).toHaveBeenCalledWith([
      "/api/client/server-folders",
      "user-uuid-1",
    ]);
  });

  it("hides folder controls and ignores saved folder links when disabled", () => {
    mockSettings = { features: { serverFolders: false } };
    mockFoldersData = [{ id: 1, name: "Existing" }];
    renderComponent("?folder=1");
    expect(mockFolderQuery).toHaveBeenCalledWith(null);
    expect(screen.queryByText("Filter folder")).toBeNull();
    expect(screen.getByTestId("server-row").getAttribute("data-folders")).toBe(
      "hidden",
    );
    expect(getServers).toHaveBeenLastCalledWith(
      expect.objectContaining({ folder: undefined }),
    );
    expect(new URLSearchParams(window.location.search).has("folder")).toBe(
      false,
    );
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

  it("preserves folder links and resets pagination when changing folders", async () => {
    renderComponent("?folder=2&page=3");
    expect(getServers).toHaveBeenLastCalledWith(
      expect.objectContaining({ folder: "2", page: 3 }),
    );
    fireEvent.click(screen.getByText("Filter folder"));
    expect(getServers).toHaveBeenLastCalledWith(
      expect.objectContaining({ folder: "1", page: 1 }),
    );
    expect(new URLSearchParams(window.location.search).get("folder")).toBe("1");
    await act(async () => fireEvent.click(screen.getByText("Refresh folders")));
    expect(mockRefreshFolders).toHaveBeenCalled();
    expect(mockMutate).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Filter all"));
    expect(getServers).toHaveBeenLastCalledWith(
      expect.objectContaining({ folder: undefined }),
    );
  });

  it("explains how to add servers to an empty folder", () => {
    mockServersData.items = [];
    renderComponent("?folder=1");
    expect(screen.getByText("No servers in this folder")).toBeDefined();
    expect(screen.getByText(/Choose All servers/)).toBeDefined();
  });

  it("reports folder loading failures", () => {
    mockFoldersData = undefined;
    mockFolderError = new Error("Folders unavailable");
    renderComponent();
    expect(mockClearAndAddHttpError).toHaveBeenCalledWith({
      key: "dashboard",
      error: mockFolderError,
    });
  });

  it("advertises owner searches only in the admin view", () => {
    mockShowOnlyAdmin = true;
    mockServersData.items = [];
    renderComponent("?q=nobody@example.test");
    expect(screen.getByRole("searchbox").getAttribute("placeholder")).toContain(
      "username or email",
    );
    expect(
      screen.getByText(/Try a server name, address, owner username or email/),
    ).toBeDefined();
  });
});
