import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import RemoveSubuserButton from "@/components/server/users/RemoveSubuserButton";
import { ServerContext } from "@/state/server";
import deleteSubuser from "@/api/server/users/deleteSubuser";
import { Subuser } from "@/state/server/subusers";

vi.mock("@/api/server/users/deleteSubuser");

const mockAddError = vi.fn();
const mockClearFlashes = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    addError: mockAddError,
    clearFlashes: mockClearFlashes,
  }),
}));

const mockSubuser: Subuser = {
  uuid: "subuser-uuid-1",
  username: "testuser",
  email: "subuser@example.com",
  image: "https://gravatar.com/avatar/123",
  twoFactorEnabled: false,
  createdAt: new Date(),
  permissions: ["control.start"],
  can: () => true,
};

const Inner = ({ children }: { children: React.ReactNode }) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);

  useEffect(() => {
    setServer({
      id: "1",
      uuid: "server-user-uuid",
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

describe("RemoveSubuserButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders delete button and opens confirmation modal on click", () => {
    render(
      <Wrapper>
        <RemoveSubuserButton subuser={mockSubuser} />
      </Wrapper>,
    );

    const deleteBtn = screen.getByRole("button", { name: "Delete subuser" });
    expect(deleteBtn).toBeDefined();

    fireEvent.click(deleteBtn);

    expect(screen.getByText("Delete this subuser?")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Yes, remove subuser" }),
    ).toBeDefined();
  });

  it("calls deleteSubuser API and updates store on confirmation", async () => {
    vi.mocked(deleteSubuser).mockResolvedValueOnce(undefined as any);

    render(
      <Wrapper>
        <RemoveSubuserButton subuser={mockSubuser} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete subuser" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Yes, remove subuser" }),
    );

    await waitFor(() => {
      expect(deleteSubuser).toHaveBeenCalledWith(
        "server-user-uuid",
        "subuser-uuid-1",
      );
    });
  });

  it("handles deletion failure and reports error message", async () => {
    const error = new Error("Failed to delete subuser");
    vi.mocked(deleteSubuser).mockRejectedValueOnce(error);

    render(
      <Wrapper>
        <RemoveSubuserButton subuser={mockSubuser} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete subuser" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Yes, remove subuser" }),
    );

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith({
        key: "users",
        message: "Failed to delete subuser",
      });
    });
  });

  it("dismisses confirmation modal on Cancel", async () => {
    render(
      <Wrapper>
        <RemoveSubuserButton subuser={mockSubuser} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete subuser" }));
    expect(screen.getByText("Delete this subuser?")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByText("Delete this subuser?")).toBeNull();
    });
  });
});
