import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { store } from "@/state";
import PanelBackground from "./PanelBackground";
import LoginFormContainer from "@/components/auth/LoginFormContainer";
import { SiteSettings } from "@/state/settings";

vi.mock("@blueprint/extends/Attribution", () => ({ default: () => null }));
vi.mock("@blueprint/components/Authentication/Container/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Authentication/Container/AfterContent", () => ({
  default: () => null,
}));

const settings: SiteSettings = {
  name: "Test Panel",
  locale: "en",
  recaptcha: { enabled: false, siteKey: "" },
  blueprint: { disable_attribution: true },
  appearance: {
    primaryColor: "#a85cf4",
    loginLayout: "split-left",
    loginLogoPosition: "opposite",
    loginBackground: {
      url: "/storage/backgrounds/login/test.png",
      blur: 8,
      overlay: 45,
    },
    clientBackground: {
      url: "/storage/backgrounds/client/test.png",
      blur: 4,
      overlay: 80,
    },
  },
};

beforeEach(() => {
  store.getActions().settings.setSettings(settings);
});
afterEach(cleanup);

it.each(["/auth/login", "/auth/password", "/auth/login/checkpoint"])(
  "uses the login background at %s and keeps controls sharp",
  (path) => {
    const { container } = render(
      <MemoryRouter initialEntries={[path]}>
        <PanelBackground />
        <input aria-label="Sign-in field" />
      </MemoryRouter>,
    );
    const background =
      container.querySelector<HTMLElement>(".panel-background")!;
    expect(background.style.backgroundImage).toContain(
      "/storage/backgrounds/login/test.png",
    );
    expect(background.style.filter).toBe("blur(8px)");
    expect(background.style.backgroundImage).toContain("0.45");
    expect(background.contains(container.querySelector("input"))).toBe(false);
    expect(background.getAttribute("aria-hidden")).toBe("true");
  },
);

it.each(["/account", "/server/test", "/"])(
  "uses independent client effects at %s",
  (path) => {
    const { container } = render(
      <MemoryRouter initialEntries={[path]}>
        <PanelBackground />
      </MemoryRouter>,
    );
    const background =
      container.querySelector<HTMLElement>(".panel-background")!;
    expect(background.style.backgroundImage).toContain(
      "/storage/backgrounds/client/test.png",
    );
    expect(background.style.filter).toBe("blur(4px)");
    expect(background.style.backgroundImage).toContain("0.8");
  },
);

it("removes the background element when there is no configured image", () => {
  store.getActions().settings.setSettings({
    ...settings,
    appearance: {
      ...settings.appearance!,
      loginBackground: { url: null, blur: 8, overlay: 45 },
    },
  });
  const { container } = render(
    <MemoryRouter initialEntries={["/auth/login"]}>
      <PanelBackground />
    </MemoryRouter>,
  );
  expect(container.querySelector(".panel-background")).toBeNull();
});

it("places the brand opposite the form and falls back above the form for centre layouts", () => {
  const { container } = render(
    <LoginFormContainer title="Sign in">
      <input />
    </LoginFormContainer>,
  );
  expect(
    container.querySelector(".authentication-side-brand .authentication-brand"),
  ).toBeTruthy();
  expect(
    container.querySelector(
      ".authentication-form-panel > .authentication-brand",
    ),
  ).toBeNull();
  act(() =>
    store.getActions().settings.setSettings({
      ...settings,
      appearance: { ...settings.appearance!, loginLayout: "center" },
    }),
  );
  expect(container.querySelector(".authentication-side-brand")).toBeNull();
  expect(
    container.querySelector(
      ".authentication-form-panel > .authentication-brand",
    ),
  ).toBeTruthy();
});

it("places the brand inside the login card when selected", () => {
  store.getActions().settings.setSettings({
    ...settings,
    appearance: { ...settings.appearance!, loginLogoPosition: "inside" },
  });
  const { container } = render(
    <LoginFormContainer title="Sign in">
      <input />
    </LoginFormContainer>,
  );
  expect(
    container.querySelector(".authentication-card > .authentication-brand"),
  ).toBeTruthy();
  expect(container.querySelector(".authentication-side-brand")).toBeNull();
});
