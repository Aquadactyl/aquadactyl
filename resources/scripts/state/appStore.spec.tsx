import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, renderHook, act } from "@testing-library/react";
import {
  appStore,
  useAppStore,
  useStoreState,
  useStoreActions,
  store,
} from "./index";
import {
  useStoreState as useHookStoreState,
  useStoreActions as useHookStoreActions,
  useStoreDispatch,
  useStore,
  StoreProvider,
} from "./hooks";
import { useStoreWithEqualityFn } from "./useStoreWithEqualityFn";
import getSystemPermissions from "@/api/getSystemPermissions";
import updateAccountEmail from "@/api/account/updateAccountEmail";
import { createStore } from "zustand/vanilla";

vi.mock("@/api/getSystemPermissions");
vi.mock("@/api/account/updateAccountEmail");

describe("state/appStore and core state slices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset slices
    appStore.getState().flashes.clearFlashes();
    appStore.getState().progress.setProgress(undefined);
  });

  describe("flashes slice", () => {
    it("adds flashes and errors, clears by key and all", () => {
      const { flashes } = appStore.getState();

      flashes.addFlash({
        id: "f1",
        key: "test-key",
        type: "success",
        message: "Operation succeeded",
      });
      expect(appStore.getState().flashes.items).toHaveLength(1);

      flashes.addError({ message: "Something failed", key: "error-key" });
      expect(appStore.getState().flashes.items).toHaveLength(2);
      expect(appStore.getState().flashes.items[1].title).toBe("Error");

      // Clear by key only removes that key
      flashes.clearFlashes("test-key");
      expect(appStore.getState().flashes.items).toHaveLength(1);
      expect(appStore.getState().flashes.items[0].key).toBe("error-key");

      // Clear all
      flashes.clearFlashes();
      expect(appStore.getState().flashes.items).toHaveLength(0);
    });

    it("handles clearAndAddHttpError with and without error", () => {
      const { flashes } = appStore.getState();
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      flashes.clearAndAddHttpError({
        error: new Error("Network crash"),
        key: "http-error",
      });
      expect(consoleSpy).toHaveBeenCalled();
      expect(appStore.getState().flashes.items).toHaveLength(1);
      expect(appStore.getState().flashes.items[0].message).toBe(
        "Network crash",
      );

      // Call with null error clears flashes
      flashes.clearAndAddHttpError({ error: null });
      expect(appStore.getState().flashes.items).toHaveLength(0);

      consoleSpy.mockRestore();
    });
  });

  describe("permissions slice", () => {
    it("sets permissions and fetches via getPermissions", async () => {
      const { permissions } = appStore.getState();
      const mockPerms: any = {
        control: { description: "Control server", keys: { start: "Start" } },
      };

      permissions.setPermissions(mockPerms);
      expect(appStore.getState().permissions.data).toEqual(mockPerms);

      vi.mocked(getSystemPermissions).mockResolvedValueOnce({
        admin: { description: "Admin", keys: {} },
      } as any);

      await permissions.getPermissions();
      expect(appStore.getState().permissions.data).toEqual({
        admin: { description: "Admin", keys: {} },
      });
    });
  });

  describe("progress slice", () => {
    it("handles startContinuous, setProgress, and setComplete", () => {
      const { progress } = appStore.getState();

      progress.startContinuous();
      expect(appStore.getState().progress.continuous).toBe(true);

      progress.setProgress(45);
      expect(appStore.getState().progress.progress).toBe(45);

      // setComplete when progress was set
      progress.setComplete();
      expect(appStore.getState().progress.continuous).toBe(false);
      expect(appStore.getState().progress.progress).toBe(100);

      // setComplete when progress was undefined
      progress.setProgress(undefined);
      progress.setComplete();
      expect(appStore.getState().progress.progress).toBeUndefined();
    });
  });

  describe("settings slice", () => {
    it("sets site settings", () => {
      const { settings } = appStore.getState();
      const mockSettings: any = {
        name: "Test Panel",
        locale: "en",
        recaptcha: { enabled: false, siteKey: "" },
        blueprint: { disable_attribution: false },
      };

      settings.setSettings(mockSettings);
      expect(appStore.getState().settings.data).toEqual(mockSettings);
    });
  });

  describe("user slice", () => {
    const mockUser: any = {
      uuid: "usr_1",
      username: "alex",
      email: "alex@example.com",
      language: "en",
      rootAdmin: true,
      useTotp: false,
    };

    it("sets user data and updates user data with/without existing state", () => {
      const { user } = appStore.getState();

      // updateUserData when data is undefined
      user.updateUserData(mockUser);
      expect(appStore.getState().user.data).toEqual(mockUser);

      // setUserData
      user.setUserData({ ...mockUser, username: "alex_updated" });
      expect(appStore.getState().user.data?.username).toBe("alex_updated");

      // updateUserData when data exists
      user.updateUserData({ email: "newalex@example.com" });
      expect(appStore.getState().user.data?.email).toBe("newalex@example.com");
      expect(appStore.getState().user.data?.username).toBe("alex_updated");
    });

    it("updates user email via updateUserEmail", async () => {
      const { user } = appStore.getState();
      vi.mocked(updateAccountEmail).mockResolvedValueOnce(undefined);

      await user.updateUserEmail({
        email: "verified@example.com",
        password: "secretpassword",
      });

      expect(updateAccountEmail).toHaveBeenCalledWith(
        "verified@example.com",
        "secretpassword",
      );
      expect(appStore.getState().user.data?.email).toBe("verified@example.com");
    });
  });

  describe("facade store and react hooks", () => {
    it("supports store object methods", () => {
      expect(store.getState()).toBe(appStore.getState());
      expect(store.getActions()).toBe(appStore.getState());
      expect(typeof store.subscribe).toBe("function");
    });

    it("supports useAppStore, useStoreState, and useStoreActions", () => {
      const { result: continuousResult } = renderHook(() =>
        useAppStore((s) => s.progress.continuous),
      );
      expect(continuousResult.current).toBe(false);

      const { result: stateResult } = renderHook(() =>
        useStoreState((s) => s.progress.progress),
      );
      expect(stateResult.current).toBeUndefined();

      const { result: actionsResult } = renderHook(() =>
        useStoreActions((a) => a.progress.startContinuous),
      );
      expect(typeof actionsResult.current).toBe("function");
    });

    it("supports hooks from hooks.tsx and StoreProvider", () => {
      const { result: stateResult } = renderHook(() =>
        useHookStoreState((s) => s.progress.continuous),
      );
      expect(stateResult.current).toBe(false);

      const { result: actionsResult } = renderHook(() =>
        useHookStoreActions((a) => a.progress.setComplete),
      );
      expect(typeof actionsResult.current).toBe("function");

      const { result: dispatchResult } = renderHook(() => useStoreDispatch());
      expect(dispatchResult.current({ type: "TEST" })).toEqual({
        type: "TEST",
      });

      const { result: storeResult } = renderHook(() => useStore());
      expect(storeResult.current).toBe(appStore);

      const { getByText } = render(
        <StoreProvider>
          <div>Provided Child</div>
        </StoreProvider>,
      );
      expect(getByText("Provided Child")).toBeDefined();
    });

    it("tests useStoreWithEqualityFn default selector, custom equality, and unchanged snapshots", () => {
      const testStore = createStore(() => ({
        count: 1,
        nested: { val: "hello" },
      }));

      // Default selector
      const { result: defaultSelectorResult } = renderHook(() =>
        useStoreWithEqualityFn(testStore),
      );
      expect((defaultSelectorResult.current as any).count).toBe(1);

      // Custom equality function returning true preserves last selection reference
      let equalityChecks = 0;
      const { result: customEqResult, rerender } = renderHook(() =>
        useStoreWithEqualityFn(
          testStore,
          (s) => ({ text: s.nested.val }),
          (a, b) => {
            equalityChecks++;
            return a.text === b.text;
          },
        ),
      );

      const firstRef = customEqResult.current;
      expect(firstRef.text).toBe("hello");

      // Mutate store to trigger new snapshot with same nested val
      act(() => {
        testStore.setState({ count: 2, nested: { val: "hello" } });
      });

      expect(equalityChecks).toBeGreaterThan(0);
      expect(customEqResult.current).toBe(firstRef);

      // Rerender component without store mutation (hits lastSnapshotRef.current === nextSnapshot)
      rerender();
      expect(customEqResult.current).toBe(firstRef);
    });
  });
});
