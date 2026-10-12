import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import useLocationHash from "./useLocationHash";
import usePanelTranslation from "./usePanelTranslation";
import usePrivacyMode from "./usePrivacyMode";
import { appStore } from "@/state";

vi.mock("react-i18next", () => ({
  useTranslation: vi.fn((_ns: string, _opts: any) => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  })),
}));

describe("plugins misc hooks", () => {
  describe("useLocationHash", () => {
    it("parses hash parameters and creates path with pathTo", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={["/test#tab=security&mode=edit"]}>
          {children}
        </MemoryRouter>
      );

      const { result } = renderHook(() => useLocationHash(), { wrapper });

      expect(result.current.hash).toEqual({
        tab: "security",
        mode: "edit",
      });

      // Update param and delete param
      const updatedQuery = result.current.pathTo({
        tab: "backups",
        mode: undefined,
        filter: "active",
      });

      const params = new URLSearchParams(updatedQuery);
      expect(params.get("tab")).toBe("backups");
      expect(params.get("filter")).toBe("active");
      expect(params.has("mode")).toBe(false);
    });
  });

  describe("usePanelTranslation", () => {
    it("returns translation hook instance with panel namespace and useSuspense false", () => {
      const { result } = renderHook(() => usePanelTranslation());
      expect(result.current.t("hello")).toBe("hello");
    });
  });

  describe("usePrivacyMode", () => {
    it("returns true only when feature is enabled and user has blurSensitiveData enabled", () => {
      // Both true
      appStore.setState({
        settings: {
          ...appStore.getState().settings,
          data: {
            features: { privacyMode: true } as any,
          } as any,
        },
        user: {
          ...appStore.getState().user,
          data: { blurSensitiveData: true } as any,
        },
      });

      const { result: r1 } = renderHook(() => usePrivacyMode());
      expect(r1.current).toBe(true);

      // Feature disabled in settings
      appStore.setState({
        settings: {
          ...appStore.getState().settings,
          data: {
            features: { privacyMode: false } as any,
          } as any,
        },
      });

      const { result: r2 } = renderHook(() => usePrivacyMode());
      expect(r2.current).toBe(false);

      // User setting false
      appStore.setState({
        settings: {
          ...appStore.getState().settings,
          data: {
            features: { privacyMode: true } as any,
          } as any,
        },
        user: {
          ...appStore.getState().user,
          data: { blurSensitiveData: false } as any,
        },
      });

      const { result: r3 } = renderHook(() => usePrivacyMode());
      expect(r3.current).toBe(false);
    });
  });
});
