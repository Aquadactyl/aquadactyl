import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";
import LoginContainer from "./LoginContainer";
import { store } from "@/state";
import login from "@/api/auth/login";
import {
  getSignInMethods,
  loginWithPasskey,
  passkeysSupported,
} from "@/api/account/security";

vi.mock("@/api/auth/login");
vi.mock("@/api/account/security", () => ({
  getSignInMethods: vi.fn(),
  loginWithPasskey: vi.fn(),
  passkeysSupported: vi.fn(),
  securityError: vi.fn((err) => err),
}));

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

describe("components/auth/LoginContainer", () => {
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

    vi.mocked(getSignInMethods).mockResolvedValue({
      passkeys_enabled: false,
      providers: [],
    } as any);
    vi.mocked(passkeysSupported).mockReturnValue(true);
  });

  it("renders username, password fields and sign in button", async () => {
    render(
      <MemoryRouter>
        <LoginContainer />
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText(/Username or email/i)).toBeDefined();
    expect(screen.getByLabelText(/^Password$/i)).toBeDefined();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDefined();
    expect(screen.getByText("Forgot password?")).toBeDefined();
    expect(screen.getByText("Create an account")).toBeDefined();
  });

  it("redirects on initial load if confirmation_token is present in methods", async () => {
    vi.mocked(getSignInMethods).mockResolvedValueOnce({
      passkeys_enabled: false,
      providers: [],
      confirmation_token: "auto_checkpoint_123",
    } as any);

    render(
      <MemoryRouter>
        <LoginContainer />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth/login/checkpoint", {
        replace: true,
        state: { token: "auto_checkpoint_123" },
      });
    });
  });

  it("renders initial methodError if returned from getSignInMethods", async () => {
    vi.mocked(getSignInMethods).mockResolvedValueOnce({
      passkeys_enabled: false,
      providers: [],
      error: "Authentication service unavailable",
    } as any);

    render(
      <MemoryRouter>
        <LoginContainer />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Authentication service unavailable"),
    ).toBeDefined();
  });

  it("handles getSignInMethods rejection gracefully", async () => {
    vi.mocked(getSignInMethods).mockRejectedValueOnce(
      new Error("Network failed"),
    );

    render(
      <MemoryRouter>
        <LoginContainer />
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText(/Username or email/i)).toBeDefined();
  });

  it("shows passkey button when passkeys are enabled and supported", async () => {
    vi.mocked(getSignInMethods).mockResolvedValueOnce({
      passkeys_enabled: true,
      providers: [],
    } as any);

    render(
      <MemoryRouter>
        <LoginContainer />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("button", { name: "Sign in with a passkey" }),
    ).toBeDefined();
  });

  it("completes passkey login and redirects to intended URL", async () => {
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { assign: assignSpy },
    });

    vi.mocked(getSignInMethods).mockResolvedValueOnce({
      passkeys_enabled: true,
      providers: [],
    } as any);
    vi.mocked(loginWithPasskey).mockResolvedValueOnce({
      complete: true,
      intended: "/server/123",
    } as any);

    render(
      <MemoryRouter>
        <LoginContainer />
      </MemoryRouter>,
    );

    const passkeyBtn = await screen.findByRole("button", {
      name: "Sign in with a passkey",
    });
    fireEvent.click(passkeyBtn);

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith("/server/123");
    });
  });

  it("handles passkey login rejection", async () => {
    vi.mocked(getSignInMethods).mockResolvedValueOnce({
      passkeys_enabled: true,
      providers: [],
    } as any);
    vi.mocked(loginWithPasskey).mockRejectedValueOnce(
      new Error("Passkey canceled"),
    );

    render(
      <MemoryRouter>
        <LoginContainer />
      </MemoryRouter>,
    );

    const passkeyBtn = await screen.findByRole("button", {
      name: "Sign in with a passkey",
    });
    fireEvent.click(passkeyBtn);

    await waitFor(() => {
      expect(screen.getByText("Sign in")).toBeDefined();
    });
  });

  it("renders OAuth provider login buttons when providers are configured", async () => {
    vi.mocked(getSignInMethods).mockResolvedValueOnce({
      passkeys_enabled: false,
      providers: [
        { id: "discord", label: "Discord" },
        { id: "github", label: "GitHub" },
      ],
    } as any);

    render(
      <MemoryRouter>
        <LoginContainer />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("link", { name: /Continue with Discord/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: /Continue with GitHub/i }),
    ).toBeDefined();
  });

  it("submits login form and navigates to checkpoint when 2FA is required", async () => {
    vi.mocked(login).mockResolvedValueOnce({
      complete: false,
      confirmationToken: "chk_token_123",
    });

    render(
      <MemoryRouter>
        <LoginContainer />
      </MemoryRouter>,
    );

    const usernameInput = await screen.findByLabelText(/Username or email/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const submitBtn = screen.getByRole("button", { name: "Sign in" });

    fireEvent.change(usernameInput, { target: { value: "myuser" } });
    fireEvent.change(passwordInput, { target: { value: "secret123" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        username: "myuser",
        password: "secret123",
        recaptchaData: "",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/auth/login/checkpoint", {
        replace: true,
        state: { token: "chk_token_123" },
      });
    });
  });

  it("submits login form and redirects directly when complete", async () => {
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { assign: assignSpy },
    });

    vi.mocked(login).mockResolvedValueOnce({
      complete: true,
      intended: "/dashboard",
    } as any);

    render(
      <MemoryRouter>
        <LoginContainer />
      </MemoryRouter>,
    );

    const usernameInput = await screen.findByLabelText(/Username or email/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const submitBtn = screen.getByRole("button", { name: "Sign in" });

    fireEvent.change(usernameInput, { target: { value: "myuser" } });
    fireEvent.change(passwordInput, { target: { value: "secret123" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("handles login submission rejection", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(login).mockRejectedValueOnce(new Error("Invalid credentials"));

    render(
      <MemoryRouter>
        <LoginContainer />
      </MemoryRouter>,
    );

    const usernameInput = await screen.findByLabelText(/Username or email/i);
    const passwordInput = screen.getByLabelText(/^Password$/i);
    const submitBtn = screen.getByRole("button", { name: "Sign in" });

    fireEvent.change(usernameInput, { target: { value: "myuser" } });
    fireEvent.change(passwordInput, { target: { value: "wrong" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(login).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  it("hides registration link when registration is disabled", async () => {
    store.getActions().settings.setSettings({
      name: "Pterodactyl",
      locale: "en",
      recaptcha: { enabled: false, siteKey: "", provider: "recaptcha" },
      features: { registration: false },
    } as any);

    render(
      <MemoryRouter>
        <LoginContainer />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Forgot password?")).toBeDefined();
    expect(screen.queryByText("Create an account")).toBeNull();
  });
});
