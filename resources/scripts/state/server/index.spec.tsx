import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, renderHook } from "@testing-library/react";
import {
  ServerContext,
  ServerContextProvider,
  createServerStore,
  useServerStore,
} from "./index";
import getServer from "@/api/server/getServer";
import { Server } from "@/api/server/getServer";

vi.mock("@/api/server/getServer");

const mockServer: Server = {
  id: "serv_1" as any,
  uuid: "test-uuid-1",
  name: "Test Server",
  node: "Node 1",
  isNodeUnderMaintenance: false,
  status: null,
  invocation: "java",
  dockerImage: "java:8",
  sftpDetails: { ip: "127.0.0.1", port: 2022 },
  description: "",
  limits: { memory: 1024, swap: 0, disk: 1024, io: 500, cpu: 100, threads: "" },
  featureLimits: { databases: 1, allocations: 1, backups: 1 },
  isTransferring: false,
  eggFeatures: [],
  allocations: [],
  variables: [],
} as any as Server;

describe("state/server/index", () => {
  describe("Server Store Slice logic", () => {
    it("fetches server and permissions via getServer", async () => {
      const store = createServerStore();
      vi.mocked(getServer).mockResolvedValueOnce([
        mockServer,
        ["control.start"],
      ]);

      await store.getState().server.getServer("test-uuid-1");

      expect(getServer).toHaveBeenCalledWith("test-uuid-1");
      expect(store.getState().server.data).toEqual(mockServer);
      expect(store.getState().server.permissions).toEqual(["control.start"]);
      expect(store.getState().server.inConflictState).toBe(false);
      expect(store.getState().server.isInstalling).toBe(false);
    });

    it("handles setServer, conflict states, and equal no-op", () => {
      const store = createServerStore();

      // Normal state
      store.getState().server.setServer(mockServer);
      const state1 = store.getState();
      expect(state1.server.data).toEqual(mockServer);
      expect(state1.server.inConflictState).toBe(false);
      expect(state1.server.isInstalling).toBe(false);

      // Same payload is a no-op
      store.getState().server.setServer(mockServer);
      expect(store.getState()).toBe(state1);

      // Conflict state: status is set
      const installingServer: Server = { ...mockServer, status: "installing" };
      store.getState().server.setServer(installingServer);
      expect(store.getState().server.inConflictState).toBe(true);
      expect(store.getState().server.isInstalling).toBe(true);

      // Conflict state: node under maintenance
      const maintServer: Server = {
        ...mockServer,
        status: null,
        isNodeUnderMaintenance: true,
      };
      store.getState().server.setServer(maintServer);
      expect(store.getState().server.inConflictState).toBe(true);
      expect(store.getState().server.isInstalling).toBe(false);

      // Conflict state: transferring
      const transferServer: Server = {
        ...mockServer,
        status: null,
        isTransferring: true,
      };
      store.getState().server.setServer(transferServer);
      expect(store.getState().server.inConflictState).toBe(true);
      expect(store.getState().server.isInstalling).toBe(false);

      // Install failed status
      const failedServer: Server = { ...mockServer, status: "install_failed" };
      store.getState().server.setServer(failedServer);
      expect(store.getState().server.inConflictState).toBe(true);
      expect(store.getState().server.isInstalling).toBe(true);
    });

    it("handles setServerFromState with existing and non-existing data", () => {
      const store = createServerStore();

      // Calling setServerFromState when data is undefined returns unchanged state
      const beforeState = store.getState();
      store
        .getState()
        .server.setServerFromState((s) => ({ ...s, name: "New" }));
      expect(store.getState()).toBe(beforeState);

      // Set server data first
      store.getState().server.setServer(mockServer);

      // Calling with equal output returns unchanged state
      const stateWithServer = store.getState();
      store.getState().server.setServerFromState((s) => s);
      expect(store.getState()).toBe(stateWithServer);

      // Calling with updated data modifies server
      store
        .getState()
        .server.setServerFromState((s) => ({ ...s, name: "Updated Name" }));
      expect(store.getState().server.data?.name).toBe("Updated Name");
    });

    it("handles setPermissions and equal no-op", () => {
      const store = createServerStore();
      store.getState().server.setPermissions(["control.start"]);
      const state1 = store.getState();
      expect(state1.server.permissions).toEqual(["control.start"]);

      // Same permissions is a no-op
      store.getState().server.setPermissions(["control.start"]);
      expect(store.getState()).toBe(state1);

      // Different permissions updates
      store.getState().server.setPermissions(["control.stop"]);
      expect(store.getState().server.permissions).toEqual(["control.stop"]);
    });

    it("handles setServerStatus", () => {
      const store = createServerStore();
      expect(store.getState().status.value).toBe(null);

      store.getState().status.setServerStatus("running");
      expect(store.getState().status.value).toBe("running");

      store.getState().status.setServerStatus("offline");
      expect(store.getState().status.value).toBe("offline");
    });

    it("handles clearServerState with and without active socket instance", () => {
      const store = createServerStore();
      store.getState().server.setServer(mockServer);
      store.getState().status.setServerStatus("running");
      store.getState().files.setDirectory("/test/dir");

      // With mock socket
      const removeAllListeners = vi.fn();
      const close = vi.fn();
      store.getState().socket.setInstance({
        removeAllListeners,
        close,
      } as any);

      store.getState().clearServerState();

      expect(removeAllListeners).toHaveBeenCalled();
      expect(close).toHaveBeenCalled();
      expect(store.getState().server.data).toBeUndefined();
      expect(store.getState().status.value).toBe(null);
      expect(store.getState().files.directory).toBe("/");
      expect(store.getState().socket.instance).toBeNull();

      // Without socket (instance is null)
      store.getState().clearServerState();
      expect(store.getState().server.data).toBeUndefined();
    });

    it("handles cancelFileUpload when file does not exist", () => {
      const store = createServerStore();
      store.getState().files.cancelFileUpload("non-existent-upload.zip");
      expect(store.getState().files.uploads).toEqual({});
    });

    it("handles socket connection state and undefined data computation", () => {
      const store = createServerStore();
      expect(store.getState().socket.connected).toBe(false);
      store.getState().socket.setConnectionState(true);
      expect(store.getState().socket.connected).toBe(true);

      // setServerFromState returning undefined invokes computeConflictState(undefined)
      store.getState().server.setServer(mockServer);
      store.getState().server.setServerFromState((() => undefined) as any);
      expect(store.getState().server.inConflictState).toBe(false);
      expect(store.getState().server.isInstalling).toBe(false);
    });
  });

  describe("ServerContext and React Hooks", () => {
    it("preserves store across re-renders of ServerContextProvider", async () => {
      const Parent = () => {
        const [count, setCount] = React.useState(0);
        return (
          <ServerContextProvider>
            <button onClick={() => setCount((c) => c + 1)}>Increment</button>
            <span>Count: {count}</span>
          </ServerContextProvider>
        );
      };
      const { getByRole, findByText } = render(<Parent />);
      fireEvent.click(getByRole("button"));
      expect(await findByText("Count: 1")).toBeDefined();
    });
    it("provides store via ServerContextProvider and clears state on unmount", () => {
      let storeInstance: any;
      const Consumer = () => {
        const store = ServerContext.useStore();
        const setStatus = ServerContext.useStoreActions(
          (a) => a.status.setServerStatus,
        );
        React.useEffect(() => {
          storeInstance = store;
          setStatus("running");
        }, [store]);
        return <div>Consumer</div>;
      };

      const { unmount } = render(
        <ServerContextProvider>
          <Consumer />
        </ServerContextProvider>,
      );

      expect(storeInstance.getState().status.value).toBe("running");
      unmount();
      expect(storeInstance.getState().status.value).toBe(null);
    });

    it("supports useStoreState, useStoreActions, and useStore inside Provider", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ServerContext.Provider>{children}</ServerContext.Provider>
      );

      const { result: stateResult } = renderHook(
        () => ServerContext.useStoreState((s) => s.server.inConflictState),
        { wrapper },
      );
      expect(stateResult.current).toBe(false);

      const { result: actionsResult } = renderHook(
        () => ServerContext.useStoreActions((a) => a.server.setPermissions),
        { wrapper },
      );
      expect(typeof actionsResult.current).toBe("function");

      // useStore with selector
      const { result: storeWithSelector } = renderHook(
        () => ServerContext.useStore((s) => s.files.directory),
        { wrapper },
      );
      expect(storeWithSelector.current).toBe("/");

      // useStore without selector (returns store API)
      const { result: fullStore } = renderHook(() => ServerContext.useStore(), {
        wrapper,
      });
      expect(fullStore.current).toHaveProperty("getState");
    });

    it("falls back to defaultServerStore when used outside Provider", () => {
      // Outside provider: useStoreState
      const { result: stateResult } = renderHook(() =>
        ServerContext.useStoreState((s) => s.server.isInstalling),
      );
      expect(stateResult.current).toBe(false);

      // Outside provider: useStoreActions
      const { result: actionsResult } = renderHook(() =>
        ServerContext.useStoreActions((a) => a.status.setServerStatus),
      );
      expect(typeof actionsResult.current).toBe("function");

      // Outside provider: useStore without selector
      const { result: fullStore } = renderHook(() => ServerContext.useStore());
      expect(fullStore.current).toHaveProperty("getState");

      // Outside provider: useStore with selector
      const { result: storeWithSelector } = renderHook(() =>
        ServerContext.useStore((s) => s.status.value),
      );
      expect(storeWithSelector.current).toBe(null);

      // Outside provider: useServerStore hook
      const { result: serverStoreResult } = renderHook(() =>
        useServerStore((s) => s.files.directory),
      );
      expect(serverStoreResult.current).toBe("/");
    });
  });
});
