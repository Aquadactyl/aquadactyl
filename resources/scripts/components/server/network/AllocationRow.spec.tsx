import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import AllocationRow from "@/components/server/network/AllocationRow";
import { ServerContext } from "@/state/server";
import { Allocation } from "@/api/server/getServer";
import setPrimaryServerAllocation from "@/api/server/network/setPrimaryServerAllocation";

vi.mock("@/api/server/network/setPrimaryServerAllocation");
vi.mock("@/api/server/network/setServerAllocationNotes");
vi.mock("@/components/server/network/DeleteAllocationButton", () => ({
  default: () => <button aria-label={"Delete allocation"}>Delete</button>,
}));

const mockMutate = vi.fn();
vi.mock("@/api/server/network/getServerAllocations", () => ({
  default: () => ({
    mutate: mockMutate,
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
    expect(screen.getByDisplayValue("Main game port")).toBeDefined();
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

    await waitFor(() => {
      expect(setPrimaryServerAllocation).toHaveBeenCalledWith(
        "server-alloc-row-uuid",
        2,
      );
      expect(mockMutate).toHaveBeenCalled();
    });
  });
});
