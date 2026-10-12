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
});
