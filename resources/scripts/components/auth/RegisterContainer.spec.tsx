import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import RegisterContainer from "./RegisterContainer";
import { store } from "@/state";
import registerApi from "@/api/auth/register";

vi.mock("@/api/auth/register");

vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({
    t: (_key: string, fallback?: string, params?: Record<string, unknown>) => {
      if (params) {
        let str = fallback || _key;
        Object.entries(params).forEach(([k, v]) => {
          str = str.replace(`{{${k}}}`, String(v));
        });
        return str;
      }
      return fallback || _key;
    },
  }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@blueprint/extends/Attribution", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Authentication/Container/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Authentication/Container/AfterContent", () => ({
  default: () => null,
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
            onClick={() => onVerify("captcha_token_reg")}
          />
          <button data-testid="captcha-expire" onClick={() => onExpire()} />
        </div>
      );
    },
  ),
}));

describe("components/auth/RegisterContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.getActions().settings.setSettings({
      name: "Pterodactyl",
      locale: "en",
      recaptcha: {
        enabled: false,
        siteKey: "",
        provider: "recaptcha",
      },
      blueprint: {
        disable_attribution: true,
      },
      features: {
        registration: true,
      },
    } as any);
  });

  it("redirects to /auth/login if registration is disabled", async () => {
    store.getActions().settings.setSettings({
      name: "Pterodactyl",
      locale: "en",
      recaptcha: { enabled: false, siteKey: "", provider: "recaptcha" },
      blueprint: { disable_attribution: true },
      features: { registration: false },
    } as any);

    render(
      <MemoryRouter>
        <RegisterContainer />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth/login", {
        replace: true,
      });
    });
  });

  it("renders registration form fields when registration is enabled", async () => {
    render(
      <MemoryRouter>
        <RegisterContainer />
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText(/^Username$/i)).toBeDefined();
    expect(screen.getByLabelText(/Email address/i)).toBeDefined();
    expect(screen.getByLabelText(/^First name$/i)).toBeDefined();
    expect(screen.getByLabelText(/^Last name$/i)).toBeDefined();
    expect(screen.getByLabelText(/^Password$/i)).toBeDefined();
    expect(screen.getByLabelText(/Confirm password/i)).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeDefined();
  });

  it("fills registration fields and submits payload successfully", async () => {
    vi.mocked(registerApi).mockResolvedValueOnce({
      complete: false,
    } as any);

    render(
      <MemoryRouter>
        <RegisterContainer />
      </MemoryRouter>,
    );

    const usernameInput = await screen.findByLabelText(/^Username$/i);
    fireEvent.change(usernameInput, { target: { value: "newuser" } });
    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^First name$/i), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByLabelText(/^Last name$/i), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(registerApi).toHaveBeenCalledWith({
        username: "newuser",
        email: "new@example.com",
        name_first: "John",
        name_last: "Doe",
        password: "password123",
        password_confirmation: "password123",
        recaptchaData: "",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/auth/login");
    });
  });

  it("redirects to intended URL when registration is immediately complete", async () => {
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { assign: assignSpy },
    });

    vi.mocked(registerApi).mockResolvedValueOnce({
      complete: true,
      intended: "/dashboard",
    } as any);

    render(
      <MemoryRouter>
        <RegisterContainer />
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText(/^Username$/i), {
      target: { value: "newuser" },
    });
    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^First name$/i), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByLabelText(/^Last name$/i), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("redirects to '/' when registration is complete but intended is omitted", async () => {
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { assign: assignSpy },
    });

    vi.mocked(registerApi).mockResolvedValueOnce({
      complete: true,
    } as any);

    render(
      <MemoryRouter>
        <RegisterContainer />
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText(/^Username$/i), {
      target: { value: "newuser" },
    });
    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^First name$/i), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByLabelText(/^Last name$/i), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith("/");
    });
  });

  it("triggers captcha execution when captcha is enabled and token is missing", async () => {
    store.getActions().settings.setSettings({
      ...store.getState().settings.data!,
      recaptcha: {
        enabled: true,
        provider: "turnstile",
        siteKey: "turnstile-sitekey",
      },
    });

    render(
      <MemoryRouter>
        <RegisterContainer />
      </MemoryRouter>,
    );

    const captcha = await screen.findByTestId("captcha");
    expect(captcha.getAttribute("data-sitekey")).toBe("turnstile-sitekey");

    fireEvent.change(screen.getByLabelText(/^Username$/i), {
      target: { value: "newuser" },
    });
    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^First name$/i), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByLabelText(/^Last name$/i), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(mockCaptchaExecute).toHaveBeenCalledTimes(1);
    });
    expect(registerApi).not.toHaveBeenCalled();
  });

  it("handles captcha execution error", async () => {
    store.getActions().settings.setSettings({
      ...store.getState().settings.data!,
      recaptcha: {
        enabled: true,
        provider: "recaptcha",
        siteKey: "",
      },
    });
    mockCaptchaExecute.mockRejectedValueOnce(new Error("Captcha failed"));

    render(
      <MemoryRouter>
        <RegisterContainer />
      </MemoryRouter>,
    );

    const captcha = await screen.findByTestId("captcha");
    expect(captcha.getAttribute("data-sitekey")).toBe("_invalid_key");

    fireEvent.change(screen.getByLabelText(/^Username$/i), {
      target: { value: "newuser" },
    });
    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^First name$/i), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByLabelText(/^Last name$/i), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(mockCaptchaExecute).toHaveBeenCalledTimes(1);
    });
    expect(registerApi).not.toHaveBeenCalled();
  });

  it("handles captcha verify and expire callbacks, and resets captcha on register failure", async () => {
    store.getActions().settings.setSettings({
      ...store.getState().settings.data!,
      recaptcha: {
        enabled: true,
        provider: "recaptcha",
        siteKey: "sitekey-123",
      },
    });
    vi.mocked(registerApi).mockRejectedValueOnce(new Error("Email taken"));

    render(
      <MemoryRouter>
        <RegisterContainer />
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText(/^Username$/i), {
      target: { value: "newuser" },
    });
    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^First name$/i), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByLabelText(/^Last name$/i), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: "password123" },
    });

    // Test onExpire
    fireEvent.click(screen.getByTestId("captcha-expire"));

    // Test onVerify which triggers submission with token
    fireEvent.click(screen.getByTestId("captcha-verify"));

    await waitFor(() => {
      expect(registerApi).toHaveBeenCalledWith({
        username: "newuser",
        email: "new@example.com",
        name_first: "John",
        name_last: "Doe",
        password: "password123",
        password_confirmation: "password123",
        recaptchaData: "captcha_token_reg",
      });
      expect(mockCaptchaReset).toHaveBeenCalled();
    });
  });

  it("redirects when features is undefined in settings", async () => {
    store.getActions().settings.setSettings({
      name: "Pterodactyl",
      locale: "en",
      recaptcha: { enabled: false, siteKey: "", provider: "recaptcha" },
      blueprint: { disable_attribution: true },
    } as any);

    render(
      <MemoryRouter>
        <RegisterContainer />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth/login", {
        replace: true,
      });
    });
  });

  it("handles registration error when captcha is disabled", async () => {
    vi.mocked(registerApi).mockRejectedValueOnce(new Error("Server error"));

    render(
      <MemoryRouter>
        <RegisterContainer />
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText(/^Username$/i), {
      target: { value: "newuser" },
    });
    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^First name$/i), {
      target: { value: "John" },
    });
    fireEvent.change(screen.getByLabelText(/^Last name$/i), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(registerApi).toHaveBeenCalled();
    });
  });
});
