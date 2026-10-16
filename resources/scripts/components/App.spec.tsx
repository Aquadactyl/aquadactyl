import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";
import { store } from "@/state";
import { history } from "@/components/history";

vi.mock("@/api/interceptors", () => ({
  setupInterceptors: vi.fn(),
}));

vi.mock("@/components/elements/AuthenticatedRoute", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/elements/PanelBackground", () => ({
  default: () => null,
}));

vi.mock("@/components/elements/ProgressBar", () => ({
  default: () => null,
}));

vi.mock("@/components/elements/PrivacyMode", () => ({
  default: () => null,
}));

vi.mock("@/components/elements/ScreenBlock", () => ({
  NotFound: () => <div data-testid="not-found">NotFound</div>,
}));

vi.mock("@/routers/DashboardRouter", () => ({
  default: () => <div data-testid="dashboard-router">DashboardRouter</div>,
}));

vi.mock("@/routers/ServerRouter", () => ({
  default: () => <div data-testid="server-router">ServerRouter</div>,
}));

vi.mock("@/routers/AuthenticationRouter", () => ({
  default: () => <div data-testid="auth-router">AuthenticationRouter</div>,
}));

describe("components/App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).SiteConfiguration = {
      name: "Test Panel",
      locale: "en",
      recaptcha: { enabled: false },
      features: { registration: true },
    };
    (window as any).PterodactylUser = {
      uuid: "user-uuid-1",
      username: "alex",
      email: "alex@example.com",
      root_admin: true,
      use_totp: false,
      language: "en",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      avatar_url: null,
      blur_sensitive_data: false,
    };
  });

  it("initializes window user and site settings into store and renders dashboard route", async () => {
    history.push("/");

    render(<App />);

    expect(await screen.findByTestId("dashboard-router")).toBeDefined();
    expect(store.getState().user.data?.username).toBe("alex");
    expect(store.getState().settings.data?.name).toBe("Test Panel");
  });

  it.each([
    { path: "/", kind: "dashboard" },
    { path: "/auth/login", kind: "auth" },
    { path: "/server/srv-1", kind: "server" },
  ] as const)(
    "mounts the resolved $kind shell synchronously",
    ({ path, kind }) => {
      history.push(path);
      const Component = () => <div data-testid="resolved-shell">Ready</div>;
      render(<App initialRouter={{ kind, Component }} />);
      expect(screen.getByTestId("resolved-shell")).toBeDefined();
    },
  );

  it("routes to authentication router when on /auth/login", async () => {
    history.push("/auth/login");

    render(<App />);

    expect(await screen.findByTestId("auth-router")).toBeDefined();
  });

  it("routes to server router when on /server/:id", async () => {
    history.push("/server/srv-1");

    render(<App />);

    expect(await screen.findByTestId("server-router")).toBeDefined();
  });

  it("handles user initialization with string avatar_url and default blur_sensitive_data", async () => {
    (store.getActions() as any).user.setUserData(null);
    (window as any).PterodactylUser = {
      uuid: "user-uuid-2",
      username: "bob",
      email: "bob@example.com",
      root_admin: false,
      use_totp: true,
      language: "en",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      avatar_url: "https://example.com/avatar.png",
      blur_sensitive_data: undefined,
    };

    render(<App />);

    expect(store.getState().user.data?.username).toBe("bob");
    expect(store.getState().user.data?.avatarUrl).toBe(
      "https://example.com/avatar.png",
    );
    expect(store.getState().user.data?.blurSensitiveData).toBe(false);
  });
});
