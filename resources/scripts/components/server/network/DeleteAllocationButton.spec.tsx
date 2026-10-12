import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import DeleteAllocationButton from "@/components/server/network/DeleteAllocationButton";
import { ServerContext } from "@/state/server";
import deleteServerAllocation from "@/api/server/network/deleteServerAllocation";

vi.mock("@/api/server/network/deleteServerAllocation");

vi.mock("@/components/elements/dialog", () => ({
  Dialog: {
    Confirm: ({ open, onClose, title, confirm, onConfirmed, children }: any) =>
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

const mockMutate = vi.fn();
vi.mock("@/api/server/network/getServerAllocations", () => ({
  default: () => ({
    mutate: mockMutate,
  }),
}));

const mockClearFlashes = vi.fn();
const mockClearAndAddHttpError = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  useFlashKey: () => ({
    clearFlashes: mockClearFlashes,
    clearAndAddHttpError: mockClearAndAddHttpError,
  }),
}));

const Inner = ({ children }: { children: React.ReactNode }) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);

  useEffect(() => {
    setServer({
      id: "1",
      uuid: "server-alloc-uuid",
      allocations: [
        { id: 10, ip: "192.168.1.1", port: 25565, isDefault: true },
        { id: 20, ip: "192.168.1.1", port: 25566, isDefault: false },
      ],
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

describe("DeleteAllocationButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders delete button and opens confirmation dialog on click", () => {
    render(
      <Wrapper>
        <DeleteAllocationButton allocation={20} />
      </Wrapper>,
    );

    const button = screen.getByRole("button");
    expect(button).toBeDefined();

    fireEvent.click(button);

    expect(screen.getByText("Remove Allocation")).toBeDefined();
    expect(
      screen.getByText(
        "This allocation will be immediately removed from your server.",
      ),
    ).toBeDefined();
  });

  it("calls deleteServerAllocation on confirm and mutates state", async () => {
    vi.mocked(deleteServerAllocation).mockResolvedValueOnce(undefined as any);

    render(
      <Wrapper>
        <DeleteAllocationButton allocation={20} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button"));

    // Click confirm Delete
    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(deleteServerAllocation).toHaveBeenCalledWith(
        "server-alloc-uuid",
        20,
      );
      expect(mockMutate).toHaveBeenCalled();
    });

    const mutateCb = mockMutate.mock.calls[0][0];
    expect(mutateCb([{ id: 10 }, { id: 20 }])).toEqual([{ id: 10 }]);
    expect(mutateCb(undefined)).toBeUndefined();
  });

  it("closes confirmation dialog on cancel", () => {
    render(
      <Wrapper>
        <DeleteAllocationButton allocation={20} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Remove Allocation")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Remove Allocation")).toBeNull();
  });

  it("handles deletion failure and reports error", async () => {
    const error = new Error("Failed to delete allocation");
    vi.mocked(deleteServerAllocation).mockRejectedValueOnce(error);

    render(
      <Wrapper>
        <DeleteAllocationButton allocation={20} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button"));

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(mockClearAndAddHttpError).toHaveBeenCalledWith(error);
    });
  });
});
