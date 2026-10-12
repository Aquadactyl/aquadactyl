import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { StoreProvider } from "@/state/hooks";
import { store } from "@/state";
import SensitiveValue from "./SensitiveValue";
import { SiteSettings } from "@/state/settings";
import { vi, describe, it, expect, afterEach } from "vitest";

describe("SensitiveValue", () => {
  const originalSettings = store.getState().settings.data;
  afterEach(() => {
    store.getActions().user.updateUserData({ blurSensitiveData: false });
    store.getActions().settings.setSettings(originalSettings as SiteSettings);
  });

  it("allows keyboard focus when privacy mode is enabled", () => {
    store.getActions().user.updateUserData({ blurSensitiveData: true });
    render(
      <StoreProvider store={store}>
        <SensitiveValue>192.0.2.10</SensitiveValue>
      </StoreProvider>,
    );
    const el = screen.getByText("192.0.2.10");
    expect(el.getAttribute("data-sensitive")).toBe("true");
    expect(el.getAttribute("tabindex")).toBe("0");
  });

  it("does not add tab stops when privacy mode is disabled", () => {
    store.getActions().user.updateUserData({ blurSensitiveData: false });
    render(
      <StoreProvider store={store}>
        <SensitiveValue>user@example.com</SensitiveValue>
      </StoreProvider>,
    );
    const el = screen.getByText("user@example.com");
    expect(el.getAttribute("tabindex")).toBeNull();
  });

  it("honors the site restriction even when the user preference is enabled", () => {
    store.getActions().user.updateUserData({ blurSensitiveData: true });
    store.getActions().settings.setSettings({
      ...originalSettings,
      features: {
        playerCounts: true,
        customProfilePictures: true,
        privacyMode: false,
        serverQuickActions: true,
      },
    } as SiteSettings);
    render(
      <StoreProvider store={store}>
        <SensitiveValue>user@example.com</SensitiveValue>
      </StoreProvider>,
    );
    const el = screen.getByText("user@example.com");
    expect(el.getAttribute("tabindex")).toBeNull();
  });

  it("handles touch pointerDown and tap to reveal followed by click", () => {
    store.getActions().user.updateUserData({ blurSensitiveData: true });
    const onPointerDownMock = vi.fn();
    const onClickMock = vi.fn();

    render(
      <StoreProvider store={store}>
        <SensitiveValue onPointerDown={onPointerDownMock} onClick={onClickMock}>
          secret-api-key
        </SensitiveValue>
      </StoreProvider>,
    );

    const el = screen.getByText("secret-api-key");

    // 1. Touch pointer down on unfocused element
    fireEvent.pointerDown(el, { pointerType: "touch" });
    expect(onPointerDownMock).toHaveBeenCalledTimes(1);

    // 2. First click reveals (suppresses onClickMock)
    fireEvent.click(el);
    expect(onClickMock).not.toHaveBeenCalled();

    // 3. Second click triggers custom onClick handler
    fireEvent.click(el);
    expect(onClickMock).toHaveBeenCalledTimes(1);

    // 4. Mouse pointer down does not trigger touch reveal mode
    fireEvent.pointerDown(el, { pointerType: "mouse" });
    fireEvent.click(el);
    expect(onClickMock).toHaveBeenCalledTimes(2);
  });
});
