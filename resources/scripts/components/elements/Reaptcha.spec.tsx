import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { createRef } from "react";
import { render, act } from "@testing-library/react";
import Reaptcha, { ReaptchaRef } from "./Reaptcha";

describe("components/elements/Reaptcha", () => {
  let mockRenderParams: any = {};
  const mockGrecaptcha = {
    ready: vi.fn((cb) => cb()),
    render: vi.fn((_el, params) => {
      mockRenderParams = params;
      return 101;
    }),
    execute: vi.fn(),
    reset: vi.fn(),
    getResponse: vi.fn(() => "mock-captcha-token"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderParams = {};
    window.grecaptcha = mockGrecaptcha;
    // Clean document.scripts and document.head
    document.head.innerHTML = "";
  });

  it("renders container and initializes grecaptcha widget with all callbacks and methods", async () => {
    const ref = createRef<ReaptchaRef>();
    const onVerify = vi.fn();
    const onExpire = vi.fn();
    const onError = vi.fn();
    const onRender = vi.fn();

    render(
      <Reaptcha
        ref={ref}
        sitekey="recaptcha-key"
        inject={false}
        onVerify={onVerify}
        onExpire={onExpire}
        onError={onError}
        onRender={onRender}
      />,
    );

    expect(mockGrecaptcha.ready).toHaveBeenCalled();
    expect(mockGrecaptcha.render).toHaveBeenCalled();
    expect(onRender).toHaveBeenCalled();

    // Trigger callbacks
    act(() => {
      mockRenderParams.callback("verified-token");
      mockRenderParams["expired-callback"]();
      mockRenderParams["error-callback"]();
    });

    expect(onVerify).toHaveBeenCalledWith("verified-token");
    expect(onExpire).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();

    // Test imperative methods
    await ref.current?.execute();
    expect(mockGrecaptcha.execute).toHaveBeenCalledWith(101);

    await ref.current?.reset();
    expect(mockGrecaptcha.reset).toHaveBeenCalledWith(101);

    const token = await ref.current?.getResponse();
    expect(token).toBe("mock-captcha-token");
  });

  it("injects recaptcha script when inject is true and hl is provided", () => {
    render(<Reaptcha sitekey="key" inject hl="fr" size="normal" />);

    const script = document.head.querySelector("script");
    expect(script).toBeTruthy();
    expect(script?.src).toContain(
      "https://recaptcha.net/recaptcha/api.js?render=explicit&hl=fr",
    );

    // Second render with script already present does not re-inject
    render(<Reaptcha sitekey="key" inject hl="fr" />);
    expect(document.head.querySelectorAll("script").length).toBe(1);
  });

  it("handles interval polling when grecaptcha is not available at mount", () => {
    vi.useFakeTimers();
    delete (window as any).grecaptcha;

    render(<Reaptcha sitekey="key" inject={false} />);

    expect(mockGrecaptcha.render).not.toHaveBeenCalled();

    // Make grecaptcha available and advance timer
    window.grecaptcha = mockGrecaptcha;
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(mockGrecaptcha.render).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("catches errors in execute, reset, getResponse, and render", async () => {
    const error = new Error("Widget error");
    mockGrecaptcha.execute.mockImplementationOnce(() => {
      throw error;
    });
    mockGrecaptcha.reset.mockImplementationOnce(() => {
      throw error;
    });
    mockGrecaptcha.getResponse.mockImplementationOnce(() => {
      throw error;
    });

    const ref = createRef<ReaptchaRef>();
    render(<Reaptcha ref={ref} sitekey="key" inject={false} />);

    await expect(ref.current?.execute()).rejects.toThrow("Widget error");
    await expect(ref.current?.reset()).rejects.toThrow("Widget error");
    await expect(ref.current?.getResponse()).rejects.toThrow("Widget error");

    // Render error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGrecaptcha.render.mockImplementationOnce(() => {
      throw new Error("Render failed");
    });
    render(<Reaptcha sitekey="key" inject={false} />);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to render reCAPTCHA:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("rejects execute / reset / getResponse if not rendered", async () => {
    delete (window as any).grecaptcha;
    const ref = createRef<ReaptchaRef>();

    render(<Reaptcha ref={ref} sitekey="key" inject={false} />);

    await expect(ref.current?.execute()).rejects.toThrow(
      "reCAPTCHA is not rendered yet.",
    );
    await expect(ref.current?.reset()).rejects.toThrow(
      "reCAPTCHA is not rendered yet.",
    );
    await expect(ref.current?.getResponse()).rejects.toThrow(
      "reCAPTCHA is not rendered yet.",
    );
  });

  it("injects recaptcha script without hl when hl is omitted", () => {
    document.head.innerHTML = "";
    render(<Reaptcha sitekey="key" inject size="normal" />);
    const script = document.head.querySelector("script");
    expect(script).toBeTruthy();
    expect(script?.src).toBe(
      "https://recaptcha.net/recaptcha/api.js?render=explicit",
    );
  });

  it("aborts renderWidget when cancelled before ready callback runs", () => {
    let readyCb: any;
    mockGrecaptcha.ready.mockImplementationOnce((cb: any) => {
      readyCb = cb;
    });

    const { unmount } = render(<Reaptcha sitekey="key" inject={false} />);
    unmount();

    // Now execute ready callback after unmount
    readyCb?.();
    expect(mockGrecaptcha.render).not.toHaveBeenCalled();
  });

  it("handles interval polling ticks before grecaptcha becomes ready and unmount while polling", () => {
    vi.useFakeTimers();
    delete (window as any).grecaptcha;

    const { unmount } = render(<Reaptcha sitekey="key" inject={false} />);

    // Tick once with window.grecaptcha still undefined
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockGrecaptcha.render).not.toHaveBeenCalled();

    // Now unmount to test clearInterval in unmount
    unmount();
    vi.useRealTimers();
  });

  it("returns early from renderWidget on re-render when already rendered", () => {
    const { rerender } = render(<Reaptcha sitekey="key-1" inject={false} />);
    expect(mockGrecaptcha.render).toHaveBeenCalledTimes(1);

    // Re-render with new sitekey
    rerender(<Reaptcha sitekey="key-2" inject={false} />);
    expect(mockGrecaptcha.render).toHaveBeenCalledTimes(1);
  });
});
