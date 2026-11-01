import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import AuthenticationRouter from "./AuthenticationRouter";

let mockAppearance: any = null;
const mockNavigate = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      settings: {
        data: {
          appearance: mockAppearance,
        },
      },
    }),
}));

vi.mock("@/components/auth/LoginContainer", () => ({
  default: () => <div data-testid="login-container">Login</div>,
}));
vi.mock("@/components/auth/RegisterContainer", () => ({
  default: () => <div data-testid="register-container">Register</div>,
}));
vi.mock("@/components/auth/LoginCheckpointContainer", () => ({
  default: () => <div data-testid="checkpoint-container">Checkpoint</div>,
}));
vi.mock("@/components/auth/ForgotPasswordContainer", () => ({
  default: () => <div data-testid="forgot-password">Forgot Password</div>,
}));
vi.mock("@/components/auth/ResetPasswordContainer", () => ({
  default: () => <div data-testid="reset-password">Reset Password</div>,
}));
vi.mock("@/components/elements/ScreenBlock", () => ({
  NotFound: ({ onBack }: any) => (
    <div>
      <span>Not Found</span>
      <button onClick={onBack}>Go Back</button>
    </div>
  ),
}));

describe("routers/AuthenticationRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppearance = null;
  });

  it("renders login route with default center layout", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthenticationRouter />
      </MemoryRouter>,
    );

    const el = container.querySelector(".authentication-page");
    expect(el?.getAttribute("data-layout")).toBe("center");
    expect(screen.getByTestId("login-container")).toBeTruthy();
  });

  it("renders register route with custom layout", () => {
    mockAppearance = { loginLayout: "split" };

    const { container } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <AuthenticationRouter />
      </MemoryRouter>,
    );

    const el = container.querySelector(".authentication-page");
    expect(el?.getAttribute("data-layout")).toBe("split");
    expect(screen.getByTestId("register-container")).toBeTruthy();
  });

  it("renders login checkpoint route", () => {
    render(
      <MemoryRouter initialEntries={["/login/checkpoint"]}>
        <AuthenticationRouter />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("checkpoint-container")).toBeTruthy();
  });

  it("renders password and reset routes", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/password"]}>
        <AuthenticationRouter />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("forgot-password")).toBeTruthy();
    unmount();

    render(
      <MemoryRouter initialEntries={["/password/reset/abc-token"]}>
        <AuthenticationRouter />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("reset-password")).toBeTruthy();
  });

  it("renders NotFound for unrecognized route and navigates back to /auth/login", () => {
    render(
      <MemoryRouter initialEntries={["/something-else"]}>
        <AuthenticationRouter />
      </MemoryRouter>,
    );

    expect(screen.getByText("Not Found")).toBeTruthy();
    fireEvent.click(screen.getByText("Go Back"));
    expect(mockNavigate).toHaveBeenCalledWith("/auth/login");
  });
});
