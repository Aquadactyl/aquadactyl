import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import DatabasesContainer from "./DatabasesContainer";
import getServerDatabases from "@/api/server/databases/getServerDatabases";

vi.mock("@/api/server/databases/getServerDatabases", () => ({
  default: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/components/elements/Can", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/server/databases/DatabaseRow", () => ({
  default: ({ database }: any) => (
    <div data-testid="database-row">{database.name}</div>
  ),
}));

vi.mock("@/components/server/databases/CreateDatabaseButton", () => ({
  default: () => <button>Create Database Mock</button>,
}));

vi.mock("@/components/elements/Spinner", () => ({
  default: () => <span data-testid="spinner" />,
}));

vi.mock("@/components/elements/Fade", () => ({
  default: ({ children }: any) => <>{children}</>,
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
  default: () => null,
}));

let mockDatabases: any[] = [];
let mockDbLimit = 2;
const mockSetDatabases = vi.fn((dbs) => {
  mockDatabases = dbs;
});
const mockAddError = vi.fn();
const mockClearFlashes = vi.fn();

vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    addError: mockAddError,
    clearFlashes: mockClearFlashes,
  }),
}));

vi.mock("@/state/server", () => ({
  ServerContext: {
    useStoreState: (selector: any) =>
      selector({
        server: {
          data: {
            uuid: "srv-db-uuid",
            featureLimits: { databases: mockDbLimit },
          },
        },
        databases: { data: mockDatabases },
      }),
    useStoreActions: (selector: any) =>
      selector({
        databases: { setDatabases: mockSetDatabases },
      }),
  },
}));

describe("components/server/databases/DatabasesContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDatabases = [];
    mockDbLimit = 2;
  });

  it("fetches databases on mount and shows empty message when empty", async () => {
    render(<DatabasesContainer />);

    expect(mockClearFlashes).toHaveBeenCalledWith("databases");
    expect(getServerDatabases).toHaveBeenCalledWith("srv-db-uuid");

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByText("It looks like you have no databases."),
    ).toBeDefined();
  });

  it("shows databases cannot be created when limit is 0", async () => {
    mockDbLimit = 0;
    render(<DatabasesContainer />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByText("Databases cannot be created for this server."),
    ).toBeDefined();
  });

  it("renders list of databases and limit counter", async () => {
    mockDatabases = [
      {
        id: "1",
        name: "s1_db1",
        username: "u1",
        connectionString: "127.0.0.1:3306",
        allowConnectionsFrom: "%",
      },
    ];

    render(<DatabasesContainer />);

    expect(screen.getByText("s1_db1")).toBeDefined();
    expect(
      screen.getByText(/1 of 2 databases have been allocated to this server/),
    ).toBeDefined();
    expect(screen.getByText("Create Database Mock")).toBeDefined();
  });

  it("handles fetch errors by adding flash error", async () => {
    vi.mocked(getServerDatabases).mockRejectedValueOnce(
      new Error("Database error"),
    );

    render(<DatabasesContainer />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockAddError).toHaveBeenCalledWith(
      expect.objectContaining({ key: "databases" }),
    );
  });
});
