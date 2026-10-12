import { describe, it, expect, vi } from "vitest";
import React, { createRef } from "react";
import { render } from "@testing-library/react";
import Captcha, { CaptchaRef } from "./Captcha";

const mockRecaptchaExecute = vi.fn().mockResolvedValue(undefined);
const mockRecaptchaReset = vi.fn().mockResolvedValue(undefined);
vi.mock("@/components/elements/Reaptcha", () => {
  const MockReaptcha = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      execute: mockRecaptchaExecute,
      reset: mockRecaptchaReset,
    }));
    return (
      <div
        data-testid="reaptcha"
        onClick={() => props.onVerify?.("token-re")}
      />
    );
  });
  return { default: MockReaptcha };
});

const mockHcaptchaExecute = vi.fn().mockResolvedValue(undefined);
const mockHcaptchaReset = vi.fn();
vi.mock("@hcaptcha/react-hcaptcha", () => {
  const MockHcaptcha = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      execute: mockHcaptchaExecute,
      resetCaptcha: mockHcaptchaReset,
    }));
    return (
      <div data-testid="hcaptcha" onClick={() => props.onVerify?.("token-h")} />
    );
  });
  return { default: MockHcaptcha };
});

const mockTurnstileExecute = vi.fn();
const mockTurnstileReset = vi.fn();
vi.mock("@marsidev/react-turnstile", () => {
  const MockTurnstile = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      execute: mockTurnstileExecute,
      reset: mockTurnstileReset,
    }));
    return (
      <div
        data-testid="turnstile"
        onClick={() => props.onSuccess?.("token-turn")}
      />
    );
  });
  return { Turnstile: MockTurnstile };
});

describe("components/elements/Captcha", () => {
  it("renders recaptcha provider by default and forwards execute / reset", async () => {
    const ref = createRef<CaptchaRef>();
    const onVerify = vi.fn();

    const { getByTestId } = render(
      <Captcha ref={ref} sitekey="key1" onVerify={onVerify} />,
    );

    expect(getByTestId("reaptcha")).toBeDefined();

    await ref.current?.execute();
    expect(mockRecaptchaExecute).toHaveBeenCalled();

    await ref.current?.reset();
    expect(mockRecaptchaReset).toHaveBeenCalled();
  });

  it("renders hcaptcha provider and forwards execute / reset", async () => {
    const ref = createRef<CaptchaRef>();
    const onVerify = vi.fn();

    const { getByTestId } = render(
      <Captcha
        ref={ref}
        provider="hcaptcha"
        sitekey="key2"
        onVerify={onVerify}
      />,
    );

    expect(getByTestId("hcaptcha")).toBeDefined();

    await ref.current?.execute();
    expect(mockHcaptchaExecute).toHaveBeenCalledWith({ async: true });

    await ref.current?.reset();
    expect(mockHcaptchaReset).toHaveBeenCalled();
  });

  it("renders turnstile provider and forwards execute / reset", async () => {
    const ref = createRef<CaptchaRef>();
    const onVerify = vi.fn();

    const { getByTestId } = render(
      <Captcha
        ref={ref}
        provider="turnstile"
        sitekey="key3"
        onVerify={onVerify}
      />,
    );

    expect(getByTestId("turnstile")).toBeDefined();

    await ref.current?.execute();
    expect(mockTurnstileExecute).toHaveBeenCalled();

    await ref.current?.reset();
    expect(mockTurnstileReset).toHaveBeenCalled();
  });
});
