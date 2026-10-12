import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import ResetPasswordContainer from "@/components/auth/ResetPasswordContainer";
import performPasswordReset from "@/api/auth/performPasswordReset";
import { store } from "@/state";

vi.mock("@/api/auth/performPasswordReset");
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

const renderWithRouter = (
  initialEntry = "/auth/password/reset/test-token?email=user@example.com",
) => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path={"/auth/password/reset/:token"}
          element={<ResetPasswordContainer />}
        />
      </Routes>
    </MemoryRouter>,
  );
};

describe("ResetPasswordContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.getActions().settings.setSettings({
      name: "Aquadactyl",
      locale: "en",
      recaptcha: { enabled: false, siteKey: "" },
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

  it("extracts email from search params and displays password inputs", () => {
    renderWithRouter();

    const emailInput = screen.getByDisplayValue("user@example.com");
    expect(emailInput).toBeDefined();
    expect(emailInput.hasAttribute("disabled")).toBe(true);

    expect(screen.getByLabelText("New Password")).toBeDefined();
    expect(screen.getByLabelText("Confirm New Password")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Reset Password" }),
    ).toBeDefined();
  });

  it("validates password length and matching confirmation", async () => {
    renderWithRouter();

    const passwordInput = screen.getByLabelText("New Password");
    const confirmInput = screen.getByLabelText("Confirm New Password");

    // Short password
    fireEvent.change(passwordInput, { target: { value: "short" } });
    fireEvent.change(confirmInput, { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Your new password should be at least 8 characters in length.",
        ),
      ).toBeDefined();
    });

    // Mismatched passwords
    fireEvent.change(passwordInput, { target: { value: "validpassword123" } });
    fireEvent.change(confirmInput, { target: { value: "different123" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => {
      expect(
        screen.getByText("Your new password does not match."),
      ).toBeDefined();
    });
  });

  it("calls performPasswordReset and redirects on success", async () => {
    vi.mocked(performPasswordReset).mockResolvedValueOnce(undefined as any);

    const assignSpy = vi.fn();
    delete (window as any).location;
    window.location = { assign: assignSpy } as any;

    renderWithRouter();

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "newSecurePass123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "newSecurePass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => {
      expect(performPasswordReset).toHaveBeenCalledWith("user@example.com", {
        token: "test-token",
        password: "newSecurePass123!",
        passwordConfirmation: "newSecurePass123!",
      });
      expect(assignSpy).toHaveBeenCalledWith("/");
    });
  });

  it("handles reset error and displays error flash", async () => {
    const error = new Error("Token expired");
    vi.mocked(performPasswordReset).mockRejectedValueOnce(error);

    renderWithRouter();

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "newSecurePass123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "newSecurePass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => {
      expect(mockAddFlash).toHaveBeenCalledWith({
        type: "error",
        title: "Error",
        message: "Token expired",
      });
    });
  });

  it("renders and submits when email param and token are omitted", async () => {
    vi.mocked(performPasswordReset).mockResolvedValueOnce(undefined as any);

    const assignSpy = vi.fn();
    delete (window as any).location;
    window.location = { assign: assignSpy } as any;

    render(
      <MemoryRouter initialEntries={["/auth/password/reset"]}>
        <ResetPasswordContainer />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("New Password")).toBeDefined();

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "newSecurePass123!" },
    });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "newSecurePass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => {
      expect(performPasswordReset).toHaveBeenCalledWith("", {
        token: "",
        password: "newSecurePass123!",
        passwordConfirmation: "newSecurePass123!",
      });
      expect(assignSpy).toHaveBeenCalledWith("/");
    });
  });
});
