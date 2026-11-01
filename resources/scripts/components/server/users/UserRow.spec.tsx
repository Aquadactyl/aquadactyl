import { fireEvent, render, screen } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import UserRow from "@/components/server/users/UserRow";
import { ServerContext } from "@/state/server";
import { store } from "@/state";
import { Subuser } from "@/state/server/subusers";

vi.mock("@/components/server/users/EditSubuserModal", () => ({
  default: ({
    visible,
    onModalDismissed,
  }: {
    visible: boolean;
    onModalDismissed: () => void;
  }) =>
    visible ? (
      <div data-testid={"edit-subuser-modal"}>
        <span>Edit Modal</span>
        <button onClick={onModalDismissed}>Dismiss Modal</button>
      </div>
    ) : null,
}));

vi.mock("@/components/server/users/RemoveSubuserButton", () => ({
  default: () => <button aria-label={"Delete subuser"}>Delete</button>,
}));

const mockSubuser: Subuser = {
  uuid: "other-user-uuid",
  username: "johndoe",
  email: "john@example.com",
  image: "https://avatar.test/john.png",
  twoFactorEnabled: true,
  createdAt: new Date(),
  permissions: ["control.start", "control.stop", "websocket.connect"],
  can: () => true,
};

const Inner = ({
  permissions = ["user.update", "user.delete"],
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
      uuid: "server-uuid-1",
    } as any);
    setPermissions(permissions);
  }, [setServer, setPermissions, permissions]);

  if (!isReady) return null;

  return <>{children}</>;
};

const Wrapper = ({
  permissions = ["user.update", "user.delete"],
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

describe("UserRow", () => {
  beforeEach(() => {
    store.getActions().user.setUserData({
      uuid: "current-user-uuid",
      username: "admin",
      email: "admin@example.com",
      avatarUrl: null,
      language: "en",
      rootAdmin: true,
      useTotp: false,
      blurSensitiveData: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("renders subuser details, permissions count, and action buttons for other users", () => {
    render(
      <Wrapper>
        <UserRow subuser={mockSubuser} />
      </Wrapper>,
    );

    expect(screen.getByText("john@example.com")).toBeDefined();
    // 2 permissions (excluding websocket.connect)
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByRole("button", { name: "Edit subuser" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Delete subuser" }),
    ).toBeDefined();
  });

  it("opens edit modal when clicking edit button", () => {
    render(
      <Wrapper>
        <UserRow subuser={mockSubuser} />
      </Wrapper>,
    );

    expect(screen.queryByTestId("edit-subuser-modal")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Edit subuser" }));

    expect(screen.getByTestId("edit-subuser-modal")).toBeDefined();
  });

  it("does not render action buttons when row belongs to the current user", () => {
    render(
      <Wrapper>
        <UserRow
          subuser={{
            ...mockSubuser,
            uuid: "current-user-uuid",
          }}
        />
      </Wrapper>,
    );

    expect(screen.queryByRole("button", { name: "Edit subuser" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete subuser" })).toBeNull();
  });

  it("handles dismissing the edit modal", () => {
    render(
      <Wrapper>
        <UserRow subuser={mockSubuser} />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit subuser" }));
    expect(screen.getByTestId("edit-subuser-modal")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss Modal" }));
    expect(screen.queryByTestId("edit-subuser-modal")).toBeNull();
  });

  it("renders unlock icon when twoFactorEnabled is false", () => {
    render(
      <Wrapper>
        <UserRow
          subuser={{
            ...mockSubuser,
            twoFactorEnabled: false,
          }}
        />
      </Wrapper>,
    );

    expect(screen.getByText("2FA Enabled")).toBeDefined();
  });
});
