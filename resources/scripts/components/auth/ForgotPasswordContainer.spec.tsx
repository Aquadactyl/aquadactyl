import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import ForgotPasswordContainer from "@/components/auth/ForgotPasswordContainer";
import requestPasswordResetEmail from "@/api/auth/requestPasswordResetEmail";
import { store } from "@/state";

vi.mock("@/api/auth/requestPasswordResetEmail");
vi.mock("@blueprint/extends/Attribution", () => ({ default: () => null }));
vi.mock("@blueprint/components/Authentication/Container/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Authentication/Container/AfterContent", () => ({
  default: () => null,
}));

const mockAddFlash = vi.fn();
const mockClearFlashes = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    addFlash: mockAddFlash,
    clearFlashes: mockClearFlashes,
  }),
}));

const mockCaptchaExecute = vi.fn();
const mockCaptchaReset = vi.fn();
vi.mock("@/components/elements/Captcha", () => ({
  default: React.forwardRef(
    ({ onVerify, onExpire, sitekey }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        execute: mockCaptchaExecute,
        reset: mockCaptchaReset,
      }));
      return (
        <div data-testid="captcha" data-sitekey={sitekey}>
          <button
            data-testid="captcha-verify"
            onClick={() => onVerify("captcha_token_xyz")}
          />
          <button data-testid="captcha-expire" onClick={() => onExpire()} />
        </div>
      );
    },
  ),
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe("ForgotPasswordContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.getActions().settings.setSettings({
      name: "Aquadactyl",
      locale: "en",
      recaptcha: {
        enabled: false,
        provider: "recaptcha",
        siteKey: "",
      },
      appearance: {
        primaryColor: "#a85cf4",
        loginLayout: "center",
        loginLogoPosition: "above",
        loginBackground: { url: null, blur: 0, overlay: 0 },
        clientBackground: { url: null, blur: 0, overlay: 0 },
      },
      blueprint: { disable_attribution: true },
    });
  });

  it("renders email field, submit button, and return to login link", () => {
    render(
      <Wrapper>
        <ForgotPasswordContainer />
      </Wrapper>,
    );

    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByRole("button", { name: "Send Email" })).toBeDefined();
    expect(screen.getByText("Return to Login")).toBeDefined();
  });

  it("shows validation error when email is empty", async () => {
    render(
      <Wrapper>
        <ForgotPasswordContainer />
      </Wrapper>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Send Email" }));

    await waitFor(() => {
      expect(
        screen.getByText("A valid email address must be provided to continue."),
      ).toBeDefined();
    });
    expect(requestPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("submits request successfully and adds success flash", async () => {
    vi.mocked(requestPasswordResetEmail).mockResolvedValueOnce(
      "Password reset email sent!",
    );

    render(
      <Wrapper>
        <ForgotPasswordContainer />
      </Wrapper>,
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Email" }));

    await waitFor(() => {
      expect(requestPasswordResetEmail).toHaveBeenCalledWith(
        "user@example.com",
        "",
      );
      expect(mockAddFlash).toHaveBeenCalledWith({
        type: "success",
        title: "Success",
        message: "Password reset email sent!",
      });
    });
  });

  it("handles request error and displays error flash", async () => {
    const error = new Error("User not found");
    vi.mocked(requestPasswordResetEmail).mockRejectedValueOnce(error);

    render(
      <Wrapper>
        <ForgotPasswordContainer />
      </Wrapper>,
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "notfound@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Email" }));

    await waitFor(() => {
      expect(mockAddFlash).toHaveBeenCalledWith({
        type: "error",
        title: "Error",
        message: "User not found",
      });
    });
  });

  it("triggers captcha execution when captcha is enabled and token is missing", async () => {
    store.getActions().settings.setSettings({
      ...store.getState().settings.data!,
      recaptcha: {
        enabled: true,
        provider: "turnstile",
        siteKey: "test-sitekey",
      },
    });

    render(
      <Wrapper>
        <ForgotPasswordContainer />
      </Wrapper>,
    );

    expect(screen.getByTestId("captcha")).toBeDefined();
    expect(screen.getByTestId("captcha").getAttribute("data-sitekey")).toBe(
      "test-sitekey",
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Email" }));

    await waitFor(() => {
      expect(mockCaptchaExecute).toHaveBeenCalledTimes(1);
    });
    expect(requestPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("handles captcha execution error", async () => {
    store.getActions().settings.setSettings({
      ...store.getState().settings.data!,
      recaptcha: {
        enabled: true,
        provider: "turnstile",
        siteKey: "",
      },
    });
    mockCaptchaExecute.mockRejectedValueOnce(new Error("Captcha failure"));

    render(
      <Wrapper>
        <ForgotPasswordContainer />
      </Wrapper>,
    );

    expect(screen.getByTestId("captcha").getAttribute("data-sitekey")).toBe(
      "_invalid_key",
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Email" }));

    await waitFor(() => {
      expect(mockAddFlash).toHaveBeenCalledWith({
        type: "error",
        title: "Error",
        message: "Captcha failure",
      });
    });
  });

  it("handles captcha verification and expire callbacks", async () => {
    store.getActions().settings.setSettings({
      ...store.getState().settings.data!,
      recaptcha: {
        enabled: true,
        provider: "recaptcha",
        siteKey: "my-key",
      },
    });
    vi.mocked(requestPasswordResetEmail).mockResolvedValueOnce("Email sent!");

    render(
      <Wrapper>
        <ForgotPasswordContainer />
      </Wrapper>,
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "verify@example.com" },
    });

    // Test onExpire
    fireEvent.click(screen.getByTestId("captcha-expire"));

    // Test onVerify which triggers submission with token
    fireEvent.click(screen.getByTestId("captcha-verify"));

    await waitFor(() => {
      expect(requestPasswordResetEmail).toHaveBeenCalledWith(
        "verify@example.com",
        "captcha_token_xyz",
      );
      expect(mockCaptchaReset).toHaveBeenCalled();
      expect(mockAddFlash).toHaveBeenCalledWith({
        type: "success",
        title: "Success",
        message: "Email sent!",
      });
    });
  });
});
