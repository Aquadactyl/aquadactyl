import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import RenameServerBox from "@/components/server/settings/RenameServerBox";
import { ServerContext } from "@/state/server";
import renameServer from "@/api/server/renameServer";

vi.mock("@/api/server/renameServer");

vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid={"spinner"} /> : null,
}));

const mockAddError = vi.fn();
const mockClearFlashes = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    addError: mockAddError,
    clearFlashes: mockClearFlashes,
  }),
}));

const Inner = ({ children }: { children: React.ReactNode }) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);

  useEffect(() => {
    setServer({
      id: "1",
      uuid: "server-rename-uuid",
      name: "My Minecraft Server",
      description: "Survival multiplayer server",
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

describe("RenameServerBox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form prefilled with current server name and description", () => {
    render(
      <Wrapper>
        <RenameServerBox />
      </Wrapper>,
    );

    expect(screen.getByDisplayValue("My Minecraft Server")).toBeDefined();
    expect(
      screen.getByDisplayValue("Survival multiplayer server"),
    ).toBeDefined();
  });

  it("submits updated server details and updates state", async () => {
    vi.mocked(renameServer).mockResolvedValueOnce(undefined as any);

    render(
      <Wrapper>
        <RenameServerBox />
      </Wrapper>,
    );

    const nameInput = screen.getByLabelText("Server Name");
    const descInput = screen.getByLabelText("Server Description");

    fireEvent.change(nameInput, { target: { value: "New Server Name" } });
    fireEvent.change(descInput, { target: { value: "Updated description" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(renameServer).toHaveBeenCalledWith(
        "server-rename-uuid",
        "New Server Name",
        "Updated description",
      );
    });
  });

  it("validates that server name is not empty", async () => {
    render(
      <Wrapper>
        <RenameServerBox />
      </Wrapper>,
    );

    const nameInput = screen.getByLabelText("Server Name");
    fireEvent.change(nameInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("A server name must be provided.")).toBeDefined();
    });
    expect(renameServer).not.toHaveBeenCalled();
  });

  it("handles rename API failure and reports error message", async () => {
    const error = new Error("Failed to rename server");
    vi.mocked(renameServer).mockRejectedValueOnce(error);

    render(
      <Wrapper>
        <RenameServerBox />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith({
        key: "settings",
        message: "Failed to rename server",
      });
    });
  });

  it("submits empty description and falls back to empty string", async () => {
    vi.mocked(renameServer).mockResolvedValueOnce(undefined as any);

    render(
      <Wrapper>
        <RenameServerBox />
      </Wrapper>,
    );

    const descInput = screen.getByLabelText("Server Description");
    fireEvent.change(descInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(renameServer).toHaveBeenCalledWith(
        "server-rename-uuid",
        "My Minecraft Server",
        "",
      );
    });
  });
});
