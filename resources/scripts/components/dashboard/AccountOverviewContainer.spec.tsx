import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { appStore, store } from "@/state";
import { SiteSettings } from "@/state/settings";
import { AccountSecurity } from "@/api/account/security";
import AccountOverviewContainer from "./AccountOverviewContainer";
import AccountSignInMethods from "./forms/AccountSignInMethods";

const mocks = vi.hoisted(() => ({
  getSecurity: vi.fn(),
  supported: vi.fn(),
  link: vi.fn(),
  register: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({ t: (_key: string, fallback: string) => fallback }),
}));
vi.mock("@/api/http", () => ({
  httpErrorToHuman: (error: Error) => error.message,
}));
vi.mock("@/api/account/security", () => ({
  getAccountSecurity: mocks.getSecurity,
  passkeysSupported: mocks.supported,
  linkOAuthProvider: mocks.link,
  registerPasskey: mocks.register,
  removeSignInMethod: mocks.remove,
  securityError: (error: unknown) => error,
}));
vi.mock("@/components/elements/PageContentBlock", () => ({
  default: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
}));
vi.mock("./forms/UpdatePasswordForm", () => ({ default: () => null }));
vi.mock("./forms/UpdateEmailAddressForm", () => ({ default: () => null }));
vi.mock("./forms/LanguageSettingsForm", () => ({ default: () => null }));
vi.mock("./forms/ConfigureTwoFactorForm", () => ({ default: () => null }));
vi.mock("./forms/ProfilePictureForm", () => ({
  default: () => <input aria-label="Upload profile picture" />,
}));
vi.mock("./forms/PrivacySettingsForm", () => ({
  default: () => <input aria-label="Blur sensitive data" />,
}));
vi.mock("@blueprint/components/Account/Overview/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Account/Overview/AfterContent", () => ({
  default: () => null,
}));

const settings: SiteSettings = {
  name: "Aquadactyl",
  locale: "en",
  recaptcha: { enabled: false, siteKey: "" },
  blueprint: { disable_attribution: false },
  features: {
    customProfilePictures: false,
    privacyMode: false,
    playerCounts: false,
    serverQuickActions: false,
    registration: false,
  },
};

const security: AccountSecurity = {
  passkeys_enabled: false,
  providers: [],
  passkeys: [
    {
      id: 1,
      name: "Saved phone",
      created_at: "2026-10-11",
      last_used_at: null,
    },
  ],
  identities: [
    {
      id: 2,
      provider: "discord",
      display_name: "Saved Discord account",
      created_at: "2026-10-11",
      last_used_at: null,
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.supported.mockReturnValue(true);
  mocks.getSecurity.mockResolvedValue(security);
  mocks.link.mockResolvedValue(undefined);
  mocks.register.mockResolvedValue(undefined);
  mocks.remove.mockResolvedValue(undefined);
  store.getActions().settings.setSettings(settings);
});

afterEach(cleanup);

const renderAccount = async () => {
  await act(async () => {
    render(
      <MemoryRouter>
        <AccountOverviewContainer />
      </MemoryRouter>,
    );
  });
};

const renderMethods = async (overrides: Partial<AccountSecurity> = {}) => {
  mocks.getSecurity.mockResolvedValue({ ...security, ...overrides });
  await act(async () => {
    render(<AccountSignInMethods />);
  });
};

describe("account feature visibility", () => {
  it("hides disabled optional cards while keeping core account settings", async () => {
    await renderAccount();
    expect(
      screen.queryByRole("heading", { name: "Profile picture" }),
    ).toBeNull();
    expect(screen.queryByRole("heading", { name: "Privacy" })).toBeNull();
    expect(
      screen.queryByRole("heading", { name: /Passkeys|Connected accounts/i }),
    ).toBeNull();
    expect(screen.queryByLabelText("Upload profile picture")).toBeNull();
    expect(screen.queryByLabelText("Blur sensitive data")).toBeNull();
    for (const name of [
      "Language",
      "Password",
      "Email address",
      "Two-step verification",
    ]) {
      expect(screen.getByRole("heading", { name })).toBeTruthy();
    }
  });

  it("follows profile picture and privacy settings independently", async () => {
    store.getActions().settings.setSettings({
      ...settings,
      features: { ...settings.features!, customProfilePictures: true },
    });
    await renderAccount();
    expect(screen.getByLabelText("Upload profile picture")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Privacy" })).toBeNull();

    act(() => {
      store.getActions().settings.setSettings({
        ...settings,
        features: { ...settings.features!, privacyMode: true },
      });
    });
    expect(
      screen.queryByRole("heading", { name: "Profile picture" }),
    ).toBeNull();
    expect(screen.getByLabelText("Blur sensitive data")).toBeTruthy();
  });

  it("does not show optional cards before settings are available", async () => {
    appStore.setState((state) => ({
      settings: { ...state.settings, data: undefined },
    }));
    await renderAccount();
    expect(screen.queryByLabelText("Upload profile picture")).toBeNull();
    expect(screen.queryByLabelText("Blur sensitive data")).toBeNull();
  });

  it("renders two-factor redirect error message when present in location state", async () => {
    await act(async () => {
      render(
        <MemoryRouter
          initialEntries={[
            { pathname: "/", state: { twoFactorRedirect: true } },
          ]}
        >
          <AccountOverviewContainer />
        </MemoryRouter>,
      );
    });

    expect(screen.getByText("Two-step verification required")).toBeTruthy();
    expect(
      screen.getByText("Enable two-step verification below to continue."),
    ).toBeTruthy();
  });
});

describe("available sign-in methods", () => {
  it("does not flash optional methods while availability is loading", async () => {
    let resolve!: (result: AccountSecurity) => void;
    mocks.getSecurity.mockReturnValue(
      new Promise<AccountSecurity>((done) => {
        resolve = done;
      }),
    );
    const { container } = render(<AccountSignInMethods />);
    expect(container.textContent).toBe("");
    await act(async () => resolve(security));
    expect(container.textContent).toBe("");
  });

  it("hides all unavailable methods, including previously saved credentials", async () => {
    const { container } = render(<AccountSignInMethods />);
    await act(async () => {});
    expect(container.textContent).toBe("");
    expect(container.querySelector("input")).toBeNull();
  });

  it("shows passkeys alone when OAuth has no configured providers", async () => {
    await renderMethods({ passkeys_enabled: true });
    expect(
      screen.getByRole("heading", { name: "Passkeys", level: 2 }),
    ).toBeTruthy();
    expect(screen.getByText("Saved phone")).toBeTruthy();
    expect(screen.getByLabelText("Passkey name")).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Connected accounts" }),
    ).toBeNull();
    expect(screen.queryByText("Saved Discord account")).toBeNull();
  });

  it("shows only configured OAuth providers and hides disabled passkeys", async () => {
    await renderMethods({ providers: [{ id: "github", label: "GitHub" }] });
    expect(
      screen.getByRole("heading", { name: "Connected accounts", level: 2 }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Link GitHub" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Passkeys" })).toBeNull();
    expect(screen.queryByText("Saved phone")).toBeNull();
    expect(screen.queryByText("Saved Discord account")).toBeNull();
    expect(screen.queryByRole("button", { name: /Discord/ })).toBeNull();
  });

  it("keeps linking and unlinking available for configured providers", async () => {
    await renderMethods({
      providers: [
        { id: "github", label: "GitHub" },
        { id: "discord", label: "Discord" },
      ],
    });
    expect(screen.getByText("Saved Discord account")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Link Discord" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Link GitHub" }));
    expect(mocks.link).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(
      "Enter your current password",
    );

    fireEvent.change(screen.getByLabelText("Confirm your current password"), {
      target: { value: "password-proof" },
    });
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Link GitHub" })),
    );
    expect(mocks.link).toHaveBeenCalledWith("github", "password-proof");
    expect(
      (
        screen.getByLabelText(
          "Confirm your current password",
        ) as HTMLInputElement
      ).value,
    ).toBe("");

    fireEvent.change(screen.getByLabelText("Confirm your current password"), {
      target: { value: "password-proof" },
    });
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Unlink discord" })),
    );
    expect(mocks.remove).toHaveBeenCalledWith("oauth", 2, "password-proof");
  });

  it("shows both sections when both are available", async () => {
    await renderMethods({
      passkeys_enabled: true,
      providers: [{ id: "discord", label: "Discord" }],
    });
    expect(
      screen.getByRole("heading", { name: "Passkeys and connected accounts" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Passkeys" })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Connected accounts" }),
    ).toBeTruthy();
  });

  it("explains browser limitations only when passkeys are enabled", async () => {
    mocks.supported.mockReturnValue(false);
    await renderMethods({ passkeys_enabled: true });
    expect(screen.queryByLabelText("Passkey name")).toBeNull();
    expect(
      screen.getByText(
        "Use a browser and device that support passkeys over HTTPS.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Remove passkey Saved phone" }),
    ).toBeTruthy();
  });

  it("still reports a failed availability request without an empty feature card", async () => {
    mocks.getSecurity.mockRejectedValue(
      new Error("Could not load sign-in settings."),
    );
    await act(async () => {
      render(<AccountSignInMethods />);
    });
    expect(screen.getByRole("alert").textContent).toContain(
      "Could not load sign-in settings.",
    );
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("preserves callback feedback even if the administrator disables every method", async () => {
    await renderMethods({
      error: "Provider is unavailable.",
      notice: "Your account connection was removed.",
    });
    expect(
      screen
        .getAllByRole("alert")
        .map((element) => element.textContent)
        .join(" "),
    ).toContain("Provider is unavailable.");
    expect(
      screen.getByText("Your account connection was removed."),
    ).toBeTruthy();
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
