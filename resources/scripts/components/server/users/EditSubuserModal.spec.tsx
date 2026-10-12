import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import EditSubuserModal from "./EditSubuserModal";
import { ServerContext } from "@/state/server";
import { Subuser } from "@/state/server/subusers";
import createOrUpdateSubuser from "@/api/server/users/createOrUpdateSubuser";
import { store } from "@/state";

vi.mock("@/api/server/users/createOrUpdateSubuser");

vi.mock("@/components/elements/Modal", () => ({
  default: ({ visible, children }: any) =>
    visible ? <div data-testid="modal">{children}</div> : null,
}));

vi.mock("@/components/server/users/PermissionTitleBox", () => ({
  default: ({ children, title }: any) => (
    <div data-testid="permission-title-box">
      <h3>{title}</h3>
      {children}
    </div>
  ),
}));

const mockSubuser: Subuser = {
  uuid: "subuser-uuid-1",
  username: "subuser1",
  email: "subuser@example.com",
  image: "",
  avatarUrl: null,
  twoFactorEnabled: false,
  createdAt: new Date(),
  permissions: ["control.start"],
  can: (perm: string) => perm === "control.start",
};

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const isReady = ServerContext.useStoreState(
    (s) => !!s.server.data && s.server.permissions.length > 0,
  );
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setPermissions = ServerContext.useStoreActions(
    (a) => a.server.setPermissions,
  );

  useEffect(() => {
    store.getActions().user.setUserData({
      uuid: "usr-1",
      username: "admin",
      email: "admin@test.com",
      language: "en",
      rootAdmin: true,
      useTotp: false,
      gravatar: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    store.getActions().permissions.setPermissions({
      control: {
        description: "Control",
        keys: {
          start: "Start Server",
          stop: "Stop Server",
        },
      },
    } as any);

    setServer({
      id: "1",
      uuid: "server-uuid-1",
      name: "Test Server",
      node: "Node 1",
      isNodeUnderMaintenance: false,
      status: "running",
      invocation: "start",
      dockerImage: "java",
      sftpDetails: { ip: "127.0.0.1", port: 2022 },
      description: "",
      limits: {
        memory: 1024,
        swap: 0,
        disk: 1024,
        io: 500,
        cpu: 100,
        threads: "",
      },
      featureLimits: { databases: 1, allocations: 1, backups: 2 },
      isTransferring: false,
      eggFeatures: [],
      allocations: [],
      variables: [],
    });
    setPermissions(["*"]);
  }, []);

  if (!isReady) return null;
  return <>{children}</>;
};

describe("components/server/users/EditSubuserModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Invite User form when no subuser is provided", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <EditSubuserModal visible={true} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(await screen.findByLabelText("User Email")).toBeDefined();
    expect(
      screen.getAllByRole("button", { name: "Invite User" })[0],
    ).toBeDefined();
  });

  it("renders Save form when editing existing subuser", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper>
          <EditSubuserModal visible={true} subuser={mockSubuser} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(
      (await screen.findAllByRole("button", { name: "Save" }))[0],
    ).toBeDefined();
    expect(screen.getByText("subuser@example.com")).toBeDefined();
  });

  it("submits update for existing subuser", async () => {
    vi.mocked(createOrUpdateSubuser).mockResolvedValueOnce(mockSubuser);

    render(
      <ServerContext.Provider>
        <Wrapper>
          <EditSubuserModal visible={true} subuser={mockSubuser} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const submitBtn = (
      await screen.findAllByRole("button", { name: "Save" })
    )[0];
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createOrUpdateSubuser).toHaveBeenCalledWith(
        "server-uuid-1",
        {
          email: "subuser@example.com",
          permissions: ["control.start"],
        },
        mockSubuser,
      );
    });
  });
});
