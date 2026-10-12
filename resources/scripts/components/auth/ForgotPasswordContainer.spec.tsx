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
});
