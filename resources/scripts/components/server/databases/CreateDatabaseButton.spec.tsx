import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CreateDatabaseButton from "./CreateDatabaseButton";
import createServerDatabase from "@/api/server/databases/createServerDatabase";

vi.mock("@/api/server/databases/createServerDatabase", () => ({
  default: vi.fn().mockResolvedValue({
    id: "db_new",
    name: "s1_newdb",
    username: "u1_new",
    connectionString: "127.0.0.1:3306",
    allowConnectionsFrom: "%",
  }),
}));

vi.mock("@/components/elements/Modal", () => ({
  default: ({ visible, children }: any) =>
    visible ? <div data-testid="modal">{children}</div> : null,
}));

vi.mock("@/components/FlashMessageRender", () => ({
  default: () => null,
}));

const mockAppendDatabase = vi.fn();
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
        server: { data: { uuid: "srv-db-uuid" } },
      }),
    useStoreActions: (selector: any) =>
      selector({
        databases: { appendDatabase: mockAppendDatabase },
      }),
  },
}));

describe("components/server/databases/CreateDatabaseButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens modal when clicking New Database button", () => {
    render(<CreateDatabaseButton />);

    expect(screen.queryByTestId("modal")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "New Database" }));

    expect(screen.getByTestId("modal")).toBeDefined();
    expect(screen.getByText("Create new database")).toBeDefined();
  });

  it("submits valid database creation and closes modal", async () => {
    render(<CreateDatabaseButton />);

    fireEvent.click(screen.getByRole("button", { name: "New Database" }));

    const nameInput = screen.getByLabelText("Database Name");
    const hostInput = screen.getByLabelText("Connections From");

    fireEvent.change(nameInput, { target: { value: "testdb" } });
    fireEvent.change(hostInput, { target: { value: "192.168.1.%" } });

    fireEvent.click(screen.getByRole("button", { name: "Create Database" }));

    await waitFor(() => {
      expect(createServerDatabase).toHaveBeenCalledWith("srv-db-uuid", {
        databaseName: "testdb",
        connectionsFrom: "192.168.1.%",
      });
      expect(mockAppendDatabase).toHaveBeenCalled();
      expect(screen.queryByTestId("modal")).toBeNull();
    });
  });

  it("handles submission failure by displaying flash error", async () => {
    vi.mocked(createServerDatabase).mockRejectedValueOnce(
      new Error("Limit exceeded"),
    );

    render(<CreateDatabaseButton />);

    fireEvent.click(screen.getByRole("button", { name: "New Database" }));

    const nameInput = screen.getByLabelText("Database Name");
    fireEvent.change(nameInput, { target: { value: "testdb" } });

    fireEvent.click(screen.getByRole("button", { name: "Create Database" }));

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(
        expect.objectContaining({ key: "database:create" }),
      );
    });
  });

  it("cancels modal when clicking Cancel button", () => {
    render(<CreateDatabaseButton />);

    fireEvent.click(screen.getByRole("button", { name: "New Database" }));
    expect(screen.getByTestId("modal")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByTestId("modal")).toBeNull();
  });
});
