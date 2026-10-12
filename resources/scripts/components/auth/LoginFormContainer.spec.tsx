import React from "react";
import { render, cleanup } from "@testing-library/react";
import LoginFormContainer from "./LoginFormContainer";
import { store } from "@/state";

vi.mock("@blueprint/extends/Attribution", () => ({ default: () => null }));
vi.mock("@blueprint/components/Authentication/Container/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Authentication/Container/AfterContent", () => ({
  default: () => null,
}));

describe("LoginFormContainer component", () => {
  beforeEach(() => {
    store.getActions().settings.setSettings({
      name: "Custom Panel",
      locale: "en",
      recaptcha: { enabled: false, siteKey: "" },
      blueprint: { disable_attribution: true },
      appearance: {
        primaryColor: "#a85cf4",
        loginLayout: "center",
        loginLogoPosition: "above",
        loginBackground: { url: null, blur: 0, overlay: 0 },
        clientBackground: { url: null, blur: 0, overlay: 0 },
      },
    });
  });

  afterEach(cleanup);

  it("updates document.title and renders title, description, and children", () => {
    const { getByText, getByRole } = render(
      <LoginFormContainer
        title="Login"
        description="Enter your credentials below"
      >
        <input name="username" aria-label="Username field" />
        <button type="submit">Log In</button>
      </LoginFormContainer>,
    );

    expect(document.title).toBe("Login | Custom Panel");
    expect(getByText("Login")).toBeDefined();
    expect(getByText("Enter your credentials below")).toBeDefined();
    expect(getByRole("button", { name: "Log In" })).toBeDefined();
  });

  it("renders custom logo when logoUrl is configured", () => {
    store.getActions().settings.setSettings({
      ...store.getState().settings.data!,
      logoUrl: "/storage/logo.png",
      showNameWithLogo: true,
    });

    const { container, getByText } = render(
      <LoginFormContainer title="Sign In">
        <div>Form Content</div>
      </LoginFormContainer>,
    );

    const logo = container.querySelector<HTMLImageElement>(
      "img.custom-site-logo",
    )!;
    expect(logo).toBeDefined();
    expect(logo.getAttribute("src")).toBe("/storage/logo.png");
    expect(getByText("Custom Panel")).toBeDefined();
  });

  it("positions brand logo inside the authentication card when loginLogoPosition is inside", () => {
    store.getActions().settings.setSettings({
      ...store.getState().settings.data!,
      appearance: {
        ...store.getState().settings.data!.appearance!,
        loginLogoPosition: "inside",
      },
    });

    const { container } = render(
      <LoginFormContainer title="Sign In">
        <div>Inner Content</div>
      </LoginFormContainer>,
    );

    const card = container.querySelector(".authentication-card")!;
    expect(card.querySelector(".authentication-brand")).toBeDefined();
  });
});
