import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardContainer from "./DashboardContainer";
import { MemoryRouter } from "react-router";

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
  default: ({ data, children }: any) => (
    <div>{children({ items: data.items })}</div>
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
let mockError: any = null;

vi.mock("@/lib/queryClient", () => ({
  useTanStackQuery: () => ({
    data: mockServersData,
    isLoading: mockIsLoading,
    isValidating: false,
    error: mockError,
    mutate: vi.fn(),
  }),
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
    mockError = null;
    mockServersData = {
      items: [
        {
          id: "srv-1",
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

  const renderComponent = (search = "") =>
    render(
      <MemoryRouter initialEntries={[`/${search}`]}>
        <DashboardContainer />
      </MemoryRouter>,
    );

  it("renders server rows, total count and admin switchers", () => {
    renderComponent();

    expect(screen.getByText("Survival Server")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined(); // total count
    expect(screen.getByText("Your servers")).toBeDefined();
    expect(screen.getByText("Other servers")).toBeDefined();
  });

  it("filters search input and clears search text", () => {
    renderComponent();

    const searchInput = screen.getByRole("searchbox");
    fireEvent.change(searchInput, { target: { value: "creative" } });
    expect(searchInput).toHaveProperty("value", "creative");

    const clearButton = screen.getByLabelText("Clear search");
    fireEvent.click(clearButton);
    expect(searchInput).toHaveProperty("value", "");
  });

  it("changes scope between your servers and other servers", () => {
    renderComponent();

    const otherServersBtn = screen.getByText("Other servers");
    fireEvent.click(otherServersBtn);

    expect(mockSetShowOnlyAdmin).toHaveBeenCalledWith(true);
  });

  it("displays empty state message when no servers match", () => {
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
  });
});
