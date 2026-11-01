import React from "react";
import { render, fireEvent, act, cleanup } from "@testing-library/react";
import CopyOnClick from "./CopyOnClick";
import { store } from "@/state";

describe("CopyOnClick component", () => {
  let portalEl: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    portalEl = document.createElement("div");
    portalEl.id = "modal-portal";
    document.body.appendChild(portalEl);

    store.getActions().user.setUserData({
      ...store.getState().user.data!,
      blurSensitiveData: false,
    });
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    cleanup();
    portalEl.remove();
  });

  it("throws error if children is not a valid React element", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<CopyOnClick text="123">{"plain string" as any}</CopyOnClick>);
    }).toThrow(
      "Component passed to <CopyOnClick/> must be a valid React element.",
    );

    consoleSpy.mockRestore();
  });

  it("copies text using navigator.clipboard and displays notification popup", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    const onClickMock = vi.fn();
    const { getByText, queryByText } = render(
      <CopyOnClick text="my-secret-key">
        <button onClick={onClickMock}>Copy Key</button>
      </CopyOnClick>,
    );

    const button = getByText("Copy Key");

    await act(async () => {
      fireEvent.click(button);
    });

    expect(onClickMock).toHaveBeenCalled();
    expect(writeTextMock).toHaveBeenCalledWith("my-secret-key");

    // Notification is visible
    expect(getByText('Copied "my-secret-key" to clipboard.')).toBeDefined();

    // After 2500ms, notification disappears
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(queryByText('Copied "my-secret-key" to clipboard.')).toBeNull();
  });

  it("redacts notification text when privacy mode is enabled", async () => {
    store.getActions().user.setUserData({
      ...store.getState().user.data!,
      blurSensitiveData: true,
    });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    const { getByText } = render(
      <CopyOnClick text="sensitive-token-123">
        <button>Copy Token</button>
      </CopyOnClick>,
    );

    await act(async () => {
      fireEvent.click(getByText("Copy Token"));
    });

    expect(getByText("Copied text to clipboard.")).toBeDefined();
  });

  it("uses fallback document.execCommand when navigator.clipboard fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
      configurable: true,
    });

    const execCommandFn = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandFn;

    const { getByText } = render(
      <CopyOnClick text="fallback-value">
        <button>Copy</button>
      </CopyOnClick>,
    );

    await act(async () => {
      fireEvent.click(getByText("Copy"));
    });

    expect(execCommandFn).toHaveBeenCalledWith("copy");
    expect(getByText('Copied "fallback-value" to clipboard.')).toBeDefined();
  });

  it("handles empty or null text without attaching click listener", () => {
    const { getByText } = render(
      <CopyOnClick text={null}>
        <button>Static Button</button>
      </CopyOnClick>,
    );

    const button = getByText("Static Button");
    expect(button.className).not.toContain("cursor-pointer");
  });

  it("shows generic message when showInNotification is false", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    const { getByText } = render(
      <CopyOnClick text="test-token" showInNotification={false}>
        <button>Copy</button>
      </CopyOnClick>,
    );

    await act(async () => {
      fireEvent.click(getByText("Copy"));
    });

    expect(getByText("Copied text to clipboard.")).toBeDefined();
  });

  it("handles execCommand throwing or failing when clipboard API is absent", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });

    const execSpy = vi.spyOn(document, "execCommand").mockImplementation(() => {
      throw new Error("execCommand denied");
    });

    const { getByText, queryByText } = render(
      <CopyOnClick text="failing-value">
        <button>Copy Fail</button>
      </CopyOnClick>,
    );

    await act(async () => {
      fireEvent.click(getByText("Copy Fail"));
    });

    expect(queryByText(/Copied/)).toBeNull();
    execSpy.mockRestore();
  });
});
