import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import DatabaseRow from "@/components/server/databases/DatabaseRow";
import { ServerContext } from "@/state/server";
import deleteServerDatabase from "@/api/server/databases/deleteServerDatabase";
import { ServerDatabase } from "@/api/server/databases/getServerDatabases";

vi.mock("@/api/server/databases/deleteServerDatabase");
vi.mock("@/components/server/databases/RotatePasswordButton", () => ({
  default: () => <button>Rotate Password</button>,
}));

const mockDatabase: ServerDatabase = {
  id: "db-123",
  name: "s1_mydb",
  username: "u1_myuser",
  password: "supersecretpassword",
  connectionString: "192.168.1.50:3306",
  allowConnectionsFrom: "%",
};

const Inner = ({
  permissions = ["database.view_password", "database.delete"],
  children,
}: {
  permissions?: string[];
  children: React.ReactNode;
}) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setPermissions = ServerContext.useStoreActions(
    (a) => a.server.setPermissions,
  );

  useEffect(() => {
    setServer({
      id: "1",
      uuid: "server-db-row-uuid",
    } as any);
    setPermissions(permissions);
  }, [setServer, setPermissions, permissions]);

  if (!isReady) return null;

  return <>{children}</>;
};

const Wrapper = ({
  permissions = ["database.view_password", "database.delete"],
  children,
}: {
  permissions?: string[];
  children: React.ReactNode;
}) => {
  return (
    <ServerContext.Provider>
      <Inner permissions={permissions}>{children}</Inner>
    </ServerContext.Provider>
  );
};

describe("DatabaseRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders database details and connection information", () => {
    render(
      <Wrapper>
        <DatabaseRow database={mockDatabase} />
      </Wrapper>,
    );

    expect(screen.getByText("s1_mydb")).toBeDefined();
    expect(screen.getByText("u1_myuser")).toBeDefined();
    expect(screen.getByText("192.168.1.50:3306")).toBeDefined();
  });

  it("opens Connection Details modal when clicking eye button", () => {
    render(
      <Wrapper>
        <DatabaseRow database={mockDatabase} />
      </Wrapper>,
    );

    expect(screen.queryByText("Database connection details")).toBeNull();

    // Click view connection details button (first button with eye icon)
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    expect(screen.getByText("Database connection details")).toBeDefined();
    expect(screen.getByText("JDBC Connection String")).toBeDefined();
  });

  it("opens delete modal, validates confirmation name, and deletes database", async () => {
    vi.mocked(deleteServerDatabase).mockResolvedValueOnce(undefined as any);

    render(
      <Wrapper>
        <DatabaseRow database={mockDatabase} />
      </Wrapper>,
    );

    // Click trash button
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);

    expect(screen.getByText("Confirm database deletion")).toBeDefined();

    // Type the database name to confirm
    const input = screen.getByLabelText("Confirm Database Name");
    fireEvent.change(input, { target: { value: "s1_mydb" } });

    await waitFor(() => {
      const deleteBtn = screen.getByRole("button", {
        name: "Delete Database",
      });
      expect(deleteBtn.hasAttribute("disabled")).toBe(false);
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete Database" }));

    await waitFor(() => {
      expect(deleteServerDatabase).toHaveBeenCalledWith(
        "server-db-row-uuid",
        "db-123",
      );
    });
  });
});
