import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import LoginCheckpointContainer from "@/components/auth/LoginCheckpointContainer";
import loginCheckpoint from "@/api/auth/loginCheckpoint";
import { store } from "@/state";

vi.mock("@/api/auth/loginCheckpoint");
vi.mock("@blueprint/extends/Attribution", () => ({ default: () => null }));
vi.mock("@blueprint/components/Authentication/Container/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Authentication/Container/AfterContent", () => ({
  default: () => null,
}));

const mockClearAndAddHttpError = vi.fn();
vi.mock("@/plugins/useFlash", () => ({
  default: () => ({
    clearAndAddHttpError: mockClearAndAddHttpError,
  }),
}));

const renderWithRouter = (state?: { token?: string }) => {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/auth/login/checkpoint",
          state,
        },
      ]}
    >
      <LoginCheckpointContainer />
    </MemoryRouter>,
  );
};

describe("LoginCheckpointContainer", () => {
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

  it("redirects to /auth/login when no token in route state", () => {
    renderWithRouter(undefined);

    // Should not render the checkpoint form
    expect(screen.queryByLabelText("Authentication Code")).toBeNull();
  });

  it("renders Authentication Code input and toggles to Recovery Code on device loss", () => {
    renderWithRouter({ token: "checkpoint-token-123" });

    expect(screen.getByLabelText("Authentication Code")).toBeDefined();
    expect(screen.getByText("I've Lost My Device")).toBeDefined();

    // Toggle to recovery code
    fireEvent.click(screen.getByText("I've Lost My Device"));

    expect(screen.getByLabelText("Recovery Code")).toBeDefined();
    expect(screen.getByText("I Have My Device")).toBeDefined();

    // Toggle back
    fireEvent.click(screen.getByText("I Have My Device"));
    expect(screen.getByLabelText("Authentication Code")).toBeDefined();
  });

  it("submits 2FA code and redirects on complete", async () => {
    vi.mocked(loginCheckpoint).mockResolvedValueOnce({
      complete: true,
      intended: "/dashboard",
    } as any);

    const assignSpy = vi.fn();
    delete (window as any).location;
    window.location = { assign: assignSpy } as any;

    renderWithRouter({ token: "valid-token-xyz" });

    fireEvent.change(screen.getByLabelText("Authentication Code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(loginCheckpoint).toHaveBeenCalledWith(
        "valid-token-xyz",
        "123456",
        "",
      );
      expect(assignSpy).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("submits recovery code when lost device mode is active", async () => {
    vi.mocked(loginCheckpoint).mockResolvedValueOnce({
      complete: true,
      intended: "/",
    } as any);

    const assignSpy = vi.fn();
    delete (window as any).location;
    window.location = { assign: assignSpy } as any;

    renderWithRouter({ token: "valid-token-xyz" });

    fireEvent.click(screen.getByText("I've Lost My Device"));
    fireEvent.change(screen.getByLabelText("Recovery Code"), {
      target: { value: "RC-ABCD-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(loginCheckpoint).toHaveBeenCalledWith(
        "valid-token-xyz",
        "",
        "RC-ABCD-1234",
      );
      expect(assignSpy).toHaveBeenCalledWith("/");
    });
  });

  it("handles login failure and reports error", async () => {
    const error = new Error("Invalid checkpoint code");
    vi.mocked(loginCheckpoint).mockRejectedValueOnce(error);

    renderWithRouter({ token: "valid-token-xyz" });

    fireEvent.change(screen.getByLabelText("Authentication Code"), {
      target: { value: "000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(mockClearAndAddHttpError).toHaveBeenCalledWith({ error });
    });
  });

  it("handles incomplete login response and empty intended fallback", async () => {
    const assignSpy = vi.fn();
    delete (window as any).location;
    window.location = { assign: assignSpy } as any;

    vi.mocked(loginCheckpoint).mockResolvedValueOnce({
      complete: false,
    } as any);

    renderWithRouter({ token: "valid-token-xyz" });

    fireEvent.change(screen.getByLabelText("Authentication Code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(loginCheckpoint).toHaveBeenCalled();
    });
    expect(assignSpy).not.toHaveBeenCalled();

    // Now test response.complete true with intended omitted -> "/"
    vi.mocked(loginCheckpoint).mockResolvedValueOnce({
      complete: true,
      intended: "",
    } as any);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith("/");
    });
  });
});
