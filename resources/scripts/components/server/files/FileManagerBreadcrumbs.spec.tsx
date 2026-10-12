import { render, screen } from "@testing-library/react";
import React, { useEffect } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import FileManagerBreadcrumbs from "@/components/server/files/FileManagerBreadcrumbs";
import { ServerContext } from "@/state/server";

vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({
    t: (key: string, fallback?: string, params?: Record<string, unknown>) => {
      if (params) {
        let str = fallback || key;
        Object.entries(params).forEach(([k, v]) => {
          str = str.replace(`{{${k}}}`, String(v));
        });
        return str;
      }
      return fallback || key;
    },
  }),
}));

const Inner = ({
  directory,
  initialEntries,
  children,
}: {
  directory: string;
  initialEntries: string[];
  children: React.ReactNode;
}) => {
  const isReady = ServerContext.useStoreState((s) => !!s.server.data);
  const setServer = ServerContext.useStoreActions((a) => a.server.setServer);
  const setDirectory = ServerContext.useStoreActions(
    (a) => a.files.setDirectory,
  );

  useEffect(() => {
    setServer({
      id: "12345",
      uuid: "test-uuid",
      name: "Test Server",
      node: "Node 1",
      isNodeUnderMaintenance: false,
      status: "running",
      invocation: "java -jar server.jar",
      dockerImage: "java:latest",
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
      featureLimits: { databases: 1, allocations: 1, backups: 1 },
      isTransferring: false,
      eggFeatures: [],
      allocations: [],
    } as any);
    setDirectory(directory);
  }, [setServer, setDirectory, directory]);

  if (!isReady) return null;

  return (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
};

const Wrapper = ({
  directory = "/",
  initialEntries = ["/server/test-uuid/files"],
  children,
}: {
  directory?: string;
  initialEntries?: string[];
  children: React.ReactNode;
}) => {
  return (
    <ServerContext.Provider>
      <Inner directory={directory} initialEntries={initialEntries}>
        {children}
      </Inner>
    </ServerContext.Provider>
  );
};

describe("FileManagerBreadcrumbs", () => {
  it("renders base container link for root directory", () => {
    render(
      <Wrapper directory={"/"}>
        <FileManagerBreadcrumbs />
      </Wrapper>,
    );

    expect(screen.getByText("home")).toBeDefined();
    const containerLink = screen.getByText("container");
    expect(containerLink).toBeDefined();
    expect(containerLink.closest("a")?.getAttribute("href")).toBe(
      "/server/12345/files",
    );
  });

  it("renders nested directory breadcrumbs with links", () => {
    render(
      <Wrapper directory={"/plugins/essentials"}>
        <FileManagerBreadcrumbs />
      </Wrapper>,
    );

    const pluginsLink = screen.getByText("plugins");
    expect(pluginsLink.closest("a")?.getAttribute("href")).toBe(
      "/server/12345/files#/plugins",
    );
    // The last directory in list view is a span, not a link
    const essentialsSpan = screen.getByText("essentials");
    expect(essentialsSpan.tagName).toBe("SPAN");
  });

  it("renders file count summary when filesCount is provided", () => {
    render(
      <Wrapper directory={"/"}>
        <FileManagerBreadcrumbs filesCount={{ files: 3, folders: 2 }} />
      </Wrapper>,
    );

    expect(screen.getByText("3 files (2 folders)")).toBeDefined();
  });

  it("renders singular file and folder labels when count is 1", () => {
    render(
      <Wrapper directory={"/"}>
        <FileManagerBreadcrumbs filesCount={{ files: 1, folders: 1 }} />
      </Wrapper>,
    );

    expect(screen.getByText("1 file (1 folder)")).toBeDefined();
  });

  it("renders file name in file editor mode when editing an existing file", () => {
    render(
      <Wrapper
        directory={"/config"}
        initialEntries={["/server/12345/files/edit#/config/server.properties"]}
      >
        <FileManagerBreadcrumbs withinFileEditor isNewFile={false} />
      </Wrapper>,
    );

    expect(screen.getByText("server.properties")).toBeDefined();
  });

  it("handles empty hash when in file editor mode", () => {
    render(
      <Wrapper
        directory={"/config"}
        initialEntries={["/server/12345/files/edit"]}
      >
        <FileManagerBreadcrumbs withinFileEditor isNewFile={false} />
      </Wrapper>,
    );

    expect(screen.getByText("home")).toBeDefined();
  });
});
