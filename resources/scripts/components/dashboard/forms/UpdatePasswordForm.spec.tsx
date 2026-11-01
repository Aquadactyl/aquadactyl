import React from "react";
import {
  render,
  fireEvent,
  act,
  cleanup,
  waitFor,
} from "@testing-library/react";
import UpdatePasswordForm from "./UpdatePasswordForm";
import updateAccountPassword from "@/api/account/updateAccountPassword";
import { store } from "@/state";

vi.mock("@/api/account/updateAccountPassword");
vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: ({ visible, children }: any) =>
    visible ? <div data-testid="spinner-overlay">{children}</div> : null,
}));

describe("UpdatePasswordForm component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.getActions().user.setUserData({
      uuid: "123",
      username: "testuser",
      email: "test@example.com",
      avatarUrl: null,
      language: "en",
      rootAdmin: true,
      useTotp: false,
      blurSensitiveData: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(cleanup);

  it("renders form fields and initially disables the submit button", () => {
    const { getByLabelText, getByRole } = render(<UpdatePasswordForm />);

    expect(getByLabelText("Current Password")).toBeDefined();
    expect(getByLabelText("New Password")).toBeDefined();
    expect(getByLabelText("Confirm New Password")).toBeDefined();

    const submitBtn = getByRole("button", { name: "Update Password" });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
  });

  it("enables submit button when valid matching passwords are typed and submits successfully", async () => {
    const assignMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { assign: assignMock },
      writable: true,
    });

    (updateAccountPassword as any).mockResolvedValue(undefined);

    const { getByLabelText, getByRole } = render(<UpdatePasswordForm />);

    const currentInput = getByLabelText("Current Password");
    const newInput = getByLabelText("New Password");
    const confirmInput = getByLabelText("Confirm New Password");
    const submitBtn = getByRole("button", { name: "Update Password" });

    await act(async () => {
      fireEvent.change(currentInput, { target: { value: "old-password123" } });
      fireEvent.change(newInput, {
        target: { value: "super-secret-password" },
      });
      fireEvent.change(confirmInput, {
        target: { value: "super-secret-password" },
      });
    });

    await waitFor(() => {
      expect(submitBtn.hasAttribute("disabled")).toBe(false);
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(updateAccountPassword).toHaveBeenCalledWith({
      current: "old-password123",
      password: "super-secret-password",
      confirmPassword: "super-secret-password",
    });

    expect(assignMock).toHaveBeenCalledWith("/auth/login");
  });

  it("displays flash error message when API call rejects", async () => {
    (updateAccountPassword as any).mockRejectedValue(
      new Error("The current password provided was incorrect."),
    );

    const { getByLabelText, getByRole } = render(<UpdatePasswordForm />);

    await act(async () => {
      fireEvent.change(getByLabelText("Current Password"), {
        target: { value: "wrong-password" },
      });
      fireEvent.change(getByLabelText("New Password"), {
        target: { value: "new-valid-pass123" },
      });
      fireEvent.change(getByLabelText("Confirm New Password"), {
        target: { value: "new-valid-pass123" },
      });
    });

    await act(async () => {
      fireEvent.click(getByRole("button", { name: "Update Password" }));
    });

    const flashes = store.getState().flashes.items;
    expect(flashes.some((f) => f.key === "account:password")).toBe(true);
  });

  it("returns null when user data is not present in store", () => {
    store.getActions().user.setUserData(undefined as any);
    const { container } = render(<UpdatePasswordForm />);
    expect(container.firstChild).toBeNull();
  });
});
