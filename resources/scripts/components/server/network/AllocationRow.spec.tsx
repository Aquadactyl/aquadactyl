import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AllocationRow from "@/components/server/network/AllocationRow";
import { ServerContext } from "@/state/server";
import { Allocation } from "@/api/server/getServer";
import setPrimaryServerAllocation from "@/api/server/network/setPrimaryServerAllocation";
import setServerAllocationNotes from "@/api/server/network/setServerAllocationNotes";

vi.mock("@/api/server/network/setPrimaryServerAllocation");
vi.mock("@/api/server/network/setServerAllocationNotes");

vi.mock("@/components/elements/InputSpinner", () => ({
  default: ({ visible, children }: any) => (
    <div data-testid="input-spinner" data-visible={visible}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/server/network/DeleteAllocationButton", () => ({
  default: () => <button aria-label={"Delete allocation"}>Delete</button>,
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

const mockAllocation: Allocation = {
  id: 1,
  ip: "192.168.1.100",
  alias: "play.example.com",
  port: 25565,
  notes: "Main game port",
  isDefault: true,
};

const Inner = ({
  permissions = [
    "allocation.primary",
    "allocation.delete",
    "allocation.update",
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

  useEffect(() => {
    setServer({
      id: "1",
      uuid: "server-alloc-row-uuid",
      allocations: [mockAllocation],
    } as any);
    setPermissions(permissions);
  }, [setServer, setPermissions, permissions]);

  if (!isReady) return null;

  return <>{children}</>;
};

const Wrapper = ({
  permissions = [
    "allocation.primary",
    "allocation.delete",
    "allocation.update",
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

describe("AllocationRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders IP, port, notes, and Primary badge for default allocation", () => {
    render(
      <Wrapper>
        <AllocationRow allocation={mockAllocation} />
      </Wrapper>,
    );

    expect(screen.getByText("play.example.com")).toBeDefined();
    expect(screen.getByText("25565")).toBeDefined();
    expect(screen.getByText("Primary")).toBeDefined();
    expect(screen.getByText("Hostname")).toBeDefined();
    expect(screen.getByDisplayValue("Main game port")).toBeDefined();
  });

  it("renders IP address instead of alias when alias is null", () => {
    const noAliasAlloc: Allocation = {
      ...mockAllocation,
      alias: null,
      notes: null,
      isDefault: false,
    };

    render(
      <Wrapper>
        <AllocationRow allocation={noAliasAlloc} />
      </Wrapper>,
    );

    expect(screen.getByText("192.168.1.100")).toBeDefined();
    expect(screen.getByText("IP Address")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Delete allocation" }),
    ).toBeDefined();
  });

  it("renders Make Primary button for non-default allocation and sets primary on click", async () => {
    vi.mocked(setPrimaryServerAllocation).mockResolvedValueOnce(
      undefined as any,
    );

    const nonDefaultAllocation: Allocation = {
      ...mockAllocation,
      id: 2,
      port: 25566,
      isDefault: false,
    };

    render(
      <Wrapper>
        <AllocationRow allocation={nonDefaultAllocation} />
      </Wrapper>,
    );

    const makePrimaryBtn = screen.getByRole("button", {
      name: "Make Primary",
    });
    expect(makePrimaryBtn).toBeDefined();

    fireEvent.click(makePrimaryBtn);

    expect(mockMutate).toHaveBeenCalled();
    const updater = mockMutate.mock.calls[0][0];
    const initial = [
      { id: 1, isDefault: true },
      { id: 2, isDefault: false },
    ];
    const updated = updater(initial);
    expect(updated[1].isDefault).toBe(true);

    await waitFor(() => {
      expect(setPrimaryServerAllocation).toHaveBeenCalledWith(
        "server-alloc-row-uuid",
        2,
      );
    });
  });

  it("handles failure when setting primary allocation", async () => {
    vi.mocked(setPrimaryServerAllocation).mockRejectedValueOnce(
      new Error("Primary failed"),
    );

    const nonDefaultAllocation: Allocation = {
      ...mockAllocation,
      id: 2,
      isDefault: false,
    };

    render(
      <Wrapper>
        <AllocationRow allocation={nonDefaultAllocation} />
      </Wrapper>,
    );

    const makePrimaryBtn = screen.getByRole("button", {
      name: "Make Primary",
    });
    fireEvent.click(makePrimaryBtn);

    await waitFor(() => {
      expect(mockClearAndAddHttpError).toHaveBeenCalled();
    });
  });

  it("debounces and updates allocation notes on textarea change", async () => {
    vi.useFakeTimers();
    vi.mocked(setServerAllocationNotes).mockResolvedValueOnce(undefined as any);

    render(
      <Wrapper>
        <AllocationRow allocation={mockAllocation} />
      </Wrapper>,
    );

    const textarea = screen.getByPlaceholderText("Notes");
    fireEvent.change(textarea, { target: { value: "Updated Notes" } });

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(setServerAllocationNotes).toHaveBeenCalledWith(
      "server-alloc-row-uuid",
      1,
      "Updated Notes",
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockMutate).toHaveBeenCalled();
    const updater = mockMutate.mock.calls[0][0];
    const initialList = [
      { id: 1, notes: "old" },
      { id: 2, notes: "other" },
    ];
    const res = updater(initialList);
    expect(res[0].notes).toBe("Updated Notes");

    vi.useRealTimers();
  });

  it("handles notes update failure", async () => {
    vi.useFakeTimers();
    vi.mocked(setServerAllocationNotes).mockRejectedValueOnce(
      new Error("Notes update failed"),
    );

    render(
      <Wrapper>
        <AllocationRow allocation={mockAllocation} />
      </Wrapper>,
    );

    const textarea = screen.getByPlaceholderText("Notes");
    fireEvent.change(textarea, { target: { value: "Failed notes" } });

    act(() => {
      vi.advanceTimersByTime(800);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockClearAndAddHttpError).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
