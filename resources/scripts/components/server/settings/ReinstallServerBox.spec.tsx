import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import ReinstallServerBox from "@/components/server/settings/ReinstallServerBox";
import { ServerContext } from "@/state/server";
import reinstallServer from "@/api/server/reinstallServer";

vi.mock("@/api/server/reinstallServer");

vi.mock("@/components/elements/dialog", () => ({
  Dialog: {
    Confirm: ({ open, title, confirm, onConfirmed, onClose, children }: any) =>
      open ? (
        <div>
          <h2>{title}</h2>
          <p>{children}</p>
          <button onClick={onConfirmed}>{confirm}</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      ) : null,
  },
}));

const mockAddFlash = vi.fn();
const mockClearFlashes = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    addFlash: mockAddFlash,
    clearFlashes: mockClearFlashes,
  }),
}));

const Inner = ({
  skipScripts = false,
  children,
}: {
  skipScripts?: boolean;
  children: React.ReactNode;
}) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);

  useEffect(() => {
    setServer({
      id: "1",
      uuid: "server-reinstall-uuid",
      skipScripts,
    } as any);
  }, [setServer, skipScripts]);

  if (!isReady) return null;

  return <>{children}</>;
};

const Wrapper = ({
  skipScripts = false,
  children,
}: {
  skipScripts?: boolean;
  children: React.ReactNode;
}) => {
  return (
    <ServerContext.Provider>
      <Inner skipScripts={skipScripts}>{children}</Inner>
    </ServerContext.Provider>
  );
};

describe("ReinstallServerBox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders notice when skipScripts is enabled", () => {
    render(
      <Wrapper skipScripts={true}>
        <ReinstallServerBox />
      </Wrapper>,
    );

    expect(
      screen.getByText(/Reinstalling this server has been disabled/),
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Reinstall Server" }),
    ).toBeNull();
  });

  it("renders button and triggers reinstall on confirmation", async () => {
    vi.mocked(reinstallServer).mockResolvedValueOnce(undefined as any);

    render(
      <Wrapper skipScripts={false}>
        <ReinstallServerBox />
      </Wrapper>,
    );

    const button = screen.getByRole("button", { name: "Reinstall Server" });
    fireEvent.click(button);

    expect(screen.getByText("Confirm server reinstallation")).toBeDefined();

    fireEvent.click(
      screen.getByRole("button", { name: "Yes, reinstall server" }),
    );

    await waitFor(() => {
      expect(reinstallServer).toHaveBeenCalledWith("server-reinstall-uuid");
      expect(mockAddFlash).toHaveBeenCalledWith({
        key: "settings",
        type: "success",
        message: "Your server has begun the reinstallation process.",
      });
    });
  });

  it("handles reinstallation failure and displays error flash", async () => {
    const error = new Error("Reinstall failed");
    vi.mocked(reinstallServer).mockRejectedValueOnce(error);

    render(
      <Wrapper skipScripts={false}>
        <ReinstallServerBox />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reinstall Server" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Yes, reinstall server" }),
    );

    await waitFor(() => {
      expect(mockAddFlash).toHaveBeenCalledWith({
        key: "settings",
        type: "error",
        message: "Reinstall failed",
      });
    });
  });

  it("closes confirmation dialog when cancelled", () => {
    render(
      <Wrapper skipScripts={false}>
        <ReinstallServerBox />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reinstall Server" }));
    expect(screen.getByText("Confirm server reinstallation")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Confirm server reinstallation")).toBeNull();
  });
});
