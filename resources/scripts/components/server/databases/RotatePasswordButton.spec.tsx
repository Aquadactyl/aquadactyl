import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import RotatePasswordButton from "@/components/server/databases/RotatePasswordButton";
import { ServerContext } from "@/state/server";
import rotateDatabasePassword from "@/api/server/databases/rotateDatabasePassword";

vi.mock("@/api/server/databases/rotateDatabasePassword");

const mockAddFlash = vi.fn();
const mockClearFlashes = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    addFlash: mockAddFlash,
    clearFlashes: mockClearFlashes,
  }),
}));

const Inner = ({ children }: { children: React.ReactNode }) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);

  useEffect(() => {
    setServer({
      id: "1",
      uuid: "server-db-uuid",
    } as any);
  }, [setServer]);

  if (!isReady) return null;

  return <>{children}</>;
};

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <ServerContext.Provider>
      <Inner>{children}</Inner>
    </ServerContext.Provider>
  );
};

describe("RotatePasswordButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if databaseId is not provided", () => {
    const { container } = render(
      <Wrapper>
        <RotatePasswordButton databaseId={""} onUpdate={vi.fn()} />
      </Wrapper>,
    );

    expect(container.firstChild).toBeNull();
  });

  it("rotates password and invokes onUpdate callback", async () => {
    const updatedDb = { id: "db-1", password: "new_rotated_password" };
    vi.mocked(rotateDatabasePassword).mockResolvedValueOnce(updatedDb as any);
    const onUpdate = vi.fn();

    render(
      <Wrapper>
        <RotatePasswordButton databaseId={"db-1"} onUpdate={onUpdate} />
      </Wrapper>,
    );

    const button = screen.getByRole("button", { name: "Rotate Password" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(rotateDatabasePassword).toHaveBeenCalledWith(
        "server-db-uuid",
        "db-1",
      );
      expect(onUpdate).toHaveBeenCalledWith(updatedDb);
    });
  });

  it("handles rotation failure and displays flash alert", async () => {
    const error = new Error("Failed to rotate database password");
    vi.mocked(rotateDatabasePassword).mockRejectedValueOnce(error);

    render(
      <Wrapper>
        <RotatePasswordButton databaseId={"db-1"} onUpdate={vi.fn()} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Rotate Password" }));

    await waitFor(() => {
      expect(mockAddFlash).toHaveBeenCalledWith({
        type: "error",
        title: "Error",
        message: "Failed to rotate database password",
        key: "database-connection-modal",
      });
    });
  });
});
