import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import LoginContainer from "./LoginContainer";
import { store } from "@/state";
import login from "@/api/auth/login";
import {
  getSignInMethods,
  loginWithPasskey,
  passkeysSupported,
} from "@/api/account/security";

vi.mock("@/api/auth/login");
vi.mock("@/api/account/security");

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

  it("navigates directly if passkey authentication returns checkpoint token", async () => {
    vi.mocked(getSignInMethods).mockResolvedValueOnce({
      passkeys_enabled: true,
      providers: [],
    } as any);
    vi.mocked(loginWithPasskey).mockResolvedValueOnce({
      complete: false,
      confirmationToken: "chk_passkey_token",
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
      expect(loginWithPasskey).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/auth/login/checkpoint", {
        replace: true,
        state: { token: "chk_passkey_token" },
      });
    });
  });
});
