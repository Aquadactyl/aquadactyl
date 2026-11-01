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
  twoFactorEnabled: false,
  createdAt: new Date(),
  permissions: ["control.start"],
  can: (perm: string) => perm === "control.start",
};

interface WrapperProps {
  children: React.ReactNode;
  rootAdmin?: boolean;
  userPermissions?: string[];
}

const Wrapper = ({
  children,
  rootAdmin = true,
  userPermissions = ["*"],
}: WrapperProps) => {
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
      rootAdmin,
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
      file: {
        description: "File",
        keys: {
          create: "Create File",
        },
      },
      websocket: {
        description: "Websocket",
        keys: {
          connect: "Connect",
        },
      },
    } as any);

    setServer({
      id: "serv_1" as any,
      uuid: "server-uuid-1",
      name: "Test Server",
      node: "Node 1",
      isNodeUnderMaintenance: false,
      status: null,
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
    } as any);
    setPermissions(userPermissions);
  }, [rootAdmin, userPermissions]);

  if (!isReady) return null;
  return <>{children}</>;
};

describe("components/server/users/EditSubuserModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders Invite User form when no subuser is provided and creates subuser", async () => {
    const newSubuser = {
      ...mockSubuser,
      uuid: "subuser-uuid-2",
      email: "invitee@example.com",
    };
    vi.mocked(createOrUpdateSubuser).mockResolvedValueOnce(newSubuser);

    render(
      <ServerContext.Provider>
        <Wrapper>
          <EditSubuserModal visible={true} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const emailInput = await screen.findByLabelText("User Email");
    expect(emailInput).toBeDefined();

    fireEvent.change(emailInput, {
      target: { value: "invitee@example.com" },
    });

    const inviteBtn = screen.getAllByRole("button", { name: "Invite User" })[0];
    fireEvent.click(inviteBtn);

    await waitFor(() => {
      expect(createOrUpdateSubuser).toHaveBeenCalledWith(
        "server-uuid-1",
        {
          email: "invitee@example.com",
          permissions: [],
        },
        undefined,
      );
    });
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
    expect(screen.getByText("Modify permissions for")).toBeDefined();
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

  it("handles submission errors and calls scrollIntoView", async () => {
    const scrollMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollMock;
    vi.mocked(createOrUpdateSubuser).mockRejectedValueOnce(
      new Error("Failed to save"),
    );

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
      expect(scrollMock).toHaveBeenCalled();
    });
  });

  it("renders with limited permissions for non-root-admin user", async () => {
    render(
      <ServerContext.Provider>
        <Wrapper rootAdmin={false} userPermissions={["control.start"]}>
          <EditSubuserModal visible={true} subuser={mockSubuser} />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(
      await screen.findByText(
        "Only permissions which your account is currently assigned may be selected when creating or modifying other users.",
      ),
    ).toBeDefined();
    expect(screen.getByText("View permissions for")).toBeDefined();
  });

  it("handles submission error when unmounted and ref.current is null", async () => {
    let rejectPromise: any;
    vi.mocked(createOrUpdateSubuser).mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectPromise = reject;
        }),
    );

    const { unmount } = render(
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
      expect(createOrUpdateSubuser).toHaveBeenCalled();
    });

    unmount();
    rejectPromise(new Error("Failed after unmount"));

    await waitFor(() => {
      expect(rejectPromise).toBeDefined();
    });
  });
});
