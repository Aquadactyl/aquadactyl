import React from "react";
import { renderHook, act } from "@testing-library/react";
import { usePermissions } from "./usePermissions";
import { ServerContext } from "@/state/server";

describe("usePermissions hook", () => {
  it("grants all permissions when user has wildcard * permission", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ServerContext.Provider>{children}</ServerContext.Provider>
    );

    const { result } = renderHook(
      () => {
        const perms = usePermissions([
          "control.start",
          "control.stop",
          "file.create",
        ]);
        const setPerms = ServerContext.useStoreActions(
          (actions) => actions.server.setPermissions,
        );
        return { perms, setPerms };
      },
      { wrapper },
    );

    act(() => {
      result.current.setPerms(["*"]);
    });

    expect(result.current.perms).toEqual([true, true, true]);
  });

  it("checks specific actions against discrete user permissions", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <ServerContext.Provider>{children}</ServerContext.Provider>;
    };

    const { result } = renderHook(
      () => {
        const perms = usePermissions([
          "control.start",
          "control.stop",
          "database.create",
        ]);
        const setPerms = ServerContext.useStoreActions(
          (actions) => actions.server.setPermissions,
        );
        return { perms, setPerms };
      },
      { wrapper },
    );

    act(() => {
      result.current.setPerms(["control.start"]);
    });

    expect(result.current.perms).toEqual([true, false, false]);
  });

  it("supports namespace wildcard matching (e.g. file.*)", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ServerContext.Provider>{children}</ServerContext.Provider>
    );

    const { result } = renderHook(
      () => {
        const perms = usePermissions(["file.*", "schedule.*"]);
        const setPerms = ServerContext.useStoreActions(
          (actions) => actions.server.setPermissions,
        );
        return { perms, setPerms };
      },
      { wrapper },
    );

    act(() => {
      result.current.setPerms(["file.create", "file.read"]);
    });

    expect(result.current.perms).toEqual([true, false]);
  });

  it("supports single string action with wildcard * and discrete permission", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ServerContext.Provider>{children}</ServerContext.Provider>
    );

    // Single string with wildcard *
    const { result: wildcardResult } = renderHook(
      () => {
        const perms = usePermissions("control.start");
        const setPerms = ServerContext.useStoreActions(
          (actions) => actions.server.setPermissions,
        );
        return { perms, setPerms };
      },
      { wrapper },
    );

    act(() => {
      wildcardResult.current.setPerms(["*"]);
    });
    expect(wildcardResult.current.perms).toEqual([true]);

    // Single string with discrete permission
    const { result: discreteResult } = renderHook(
      () => {
        const perms = usePermissions("file.read");
        const setPerms = ServerContext.useStoreActions(
          (actions) => actions.server.setPermissions,
        );
        return { perms, setPerms };
      },
      { wrapper },
    );

    act(() => {
      discreteResult.current.setPerms(["file.read"]);
    });
    expect(discreteResult.current.perms).toEqual([true]);
  });
});
