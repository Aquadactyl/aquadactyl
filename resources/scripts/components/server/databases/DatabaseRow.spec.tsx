import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import DatabaseRow from "@/components/server/databases/DatabaseRow";
import { ServerContext } from "@/state/server";
import deleteServerDatabase from "@/api/server/databases/deleteServerDatabase";
import { ServerDatabase } from "@/api/server/databases/getServerDatabases";

vi.mock("@/api/server/databases/deleteServerDatabase");
vi.mock("@/components/server/databases/RotatePasswordButton", () => ({
  default: ({ onUpdate }: any) => (
    <button onClick={() => onUpdate(mockDatabase)}>Rotate Password</button>
  ),
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
  permissions = [
    "database.view_password",
    "database.delete",
    "database.update",
  ],
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
  const appendDatabase = ServerContext.useStoreActions(
    (a) => a.databases.appendDatabase,
  );

  useEffect(() => {
    setServer({
      id: "1",
      uuid: "server-db-row-uuid",
    } as any);
    setPermissions(permissions);
    appendDatabase(mockDatabase);
  }, [setServer, setPermissions, appendDatabase, permissions]);

  if (!isReady) return null;

  return <>{children}</>;
};

const Wrapper = ({
  permissions = [
    "database.view_password",
    "database.delete",
    "database.update",
  ],
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
        <DatabaseRow database={mockDatabase} className={"custom-row-class"} />
      </Wrapper>,
    );

    expect(screen.getByText("s1_mydb")).toBeDefined();
    expect(screen.getByText("u1_myuser")).toBeDefined();
    expect(screen.getByText("192.168.1.50:3306")).toBeDefined();
  });

  it("opens Connection Details modal and handles close and password rotation", async () => {
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

    // Rotate password button triggers onUpdate
    fireEvent.click(screen.getByRole("button", { name: "Rotate Password" }));

    // Close button
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.queryByText("Database connection details")).toBeNull();
    });
  });

  it("opens delete modal, validates confirmation name, and deletes database with timeout", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
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

    vi.advanceTimersByTime(200);
    vi.useRealTimers();
  });

  it("handles deletion failure and renders error flash", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(deleteServerDatabase).mockRejectedValueOnce(
      new Error("Failed to delete"),
    );

    render(
      <Wrapper>
        <DatabaseRow database={mockDatabase} />
      </Wrapper>,
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);

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
      expect(deleteServerDatabase).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it("closes delete modal when Cancel button is clicked", async () => {
    render(
      <Wrapper>
        <DatabaseRow database={mockDatabase} />
      </Wrapper>,
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    expect(screen.getByText("Confirm database deletion")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByText("Confirm database deletion")).toBeNull();
    });
  });

  it("does not render delete button or password fields without permissions", () => {
    render(
      <Wrapper permissions={[]}>
        <DatabaseRow database={mockDatabase} />
      </Wrapper>,
    );

    // Only eye button should exist
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(1);

    fireEvent.click(buttons[0]);
    expect(screen.queryByText("Password")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Rotate Password" }),
    ).toBeNull();
  });

  it("handles onDismissed on both modals via close icon", async () => {
    render(
      <Wrapper>
        <DatabaseRow database={mockDatabase} />
      </Wrapper>,
    );

    // Open connection modal
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(screen.getByText("Database connection details")).toBeDefined();

    // Click close-icon
    const closeIcon = document.querySelector(".close-icon") as HTMLElement;
    fireEvent.click(closeIcon);
    await waitFor(() => {
      expect(screen.queryByText("Database connection details")).toBeNull();
    });

    // Open delete modal
    const deleteBtn = screen.getAllByRole("button")[1];
    fireEvent.click(deleteBtn);
    expect(screen.getByText("Confirm database deletion")).toBeDefined();

    // Click close-icon on delete modal
    const deleteCloseIcon = document.querySelector(
      ".close-icon",
    ) as HTMLElement;
    fireEvent.click(deleteCloseIcon);
    await waitFor(() => {
      expect(screen.queryByText("Confirm database deletion")).toBeNull();
    });
  });

  it("validates deletion with database name suffix and without password", async () => {
    const noPasswordDb: ServerDatabase = {
      ...mockDatabase,
      password: "",
    };

    render(
      <Wrapper>
        <DatabaseRow database={noPasswordDb} />
      </Wrapper>,
    );

    // Open delete modal
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);

    const input = screen.getByLabelText("Confirm Database Name");
    // Test suffix match "mydb"
    fireEvent.change(input, { target: { value: "mydb" } });

    await waitFor(() => {
      const deleteBtn = screen.getByRole("button", {
        name: "Delete Database",
      });
      expect(deleteBtn.hasAttribute("disabled")).toBe(false);
    });

    // Test invalid match
    fireEvent.change(input, { target: { value: "wrong_name" } });
    await waitFor(() => {
      const deleteBtn = screen.getByRole("button", {
        name: "Delete Database",
      });
      expect(deleteBtn.hasAttribute("disabled")).toBe(true);
    });
  });
});
