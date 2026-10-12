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
  });

  it("renders container and initializes grecaptcha widget", async () => {
    const ref = createRef<ReaptchaRef>();
    const onVerify = vi.fn();
    const onExpire = vi.fn();
    const onError = vi.fn();

    render(
      <Reaptcha
        ref={ref}
        sitekey="recaptcha-key"
        inject={false}
        onVerify={onVerify}
        onExpire={onExpire}
        onError={onError}
      />,
    );

    expect(mockGrecaptcha.ready).toHaveBeenCalled();
    expect(mockGrecaptcha.render).toHaveBeenCalled();

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
});
