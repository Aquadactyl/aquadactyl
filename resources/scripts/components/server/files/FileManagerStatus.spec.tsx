import { fireEvent, render, screen } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import FileManagerStatus from "./FileManagerStatus";
import { ServerContext } from "@/state/server";

vi.mock("@/components/elements/tooltip/Tooltip", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/hoc/asDialog", () => ({
  default: () => (Component: any) => (props: any) =>
    props.open ? <Component {...props} /> : null,
}));

vi.mock("@/components/elements/dialog", () => ({
  Dialog: {
    Footer: ({ children }: any) => <div>{children}</div>,
  },
  DialogWrapperContext: React.createContext({ close: vi.fn() }),
}));

const Wrapper = ({
  uploads = {},
  children,
}: {
  uploads?: Record<string, { loaded: number; total: number }>;
  children: React.ReactNode;
}) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const pushFileUpload = ServerContext.useStoreActions(
    (a) => a.files.pushFileUpload,
  );
  const clearFileUploads = ServerContext.useStoreActions(
    (a) => a.files.clearFileUploads,
  );

  useEffect(() => {
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
    clearFileUploads();
    Object.entries(uploads).forEach(([name, data]) => {
      pushFileUpload({
        name,
        data: {
          ...data,
          abort: new AbortController(),
        },
      });
    });
  }, [uploads]);

  if (!isReady) return null;
  return <>{children}</>;
};

describe("components/server/files/FileManagerStatus", () => {
  it("does not render upload button when no uploads are in progress", () => {
    render(
      <ServerContext.Provider>
        <Wrapper uploads={{}}>
          <FileManagerStatus />
        </Wrapper>
      </ServerContext.Provider>,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders upload button and opens dialog when uploads are active", async () => {
    const mockUploads = {
      "mod.jar": { loaded: 50, total: 100 },
      "config.yml": { loaded: 100, total: 100 },
    };

    render(
      <ServerContext.Provider>
        <Wrapper uploads={mockUploads}>
          <FileManagerStatus />
        </Wrapper>
      </ServerContext.Provider>,
    );

    const toggleBtn = await screen.findByRole("button");
    expect(toggleBtn).toBeDefined();

    fireEvent.click(toggleBtn);
    expect(screen.getByText("mod.jar")).toBeDefined();
    expect(screen.getByText("config.yml")).toBeDefined();
    expect(screen.getByText("Cancel Uploads")).toBeDefined();
  });
});
