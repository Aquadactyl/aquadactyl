import React from "react";
import {
  render,
  fireEvent,
  act,
  cleanup,
  waitFor,
} from "@testing-library/react";
import UpdateEmailAddressForm from "./UpdateEmailAddressForm";
import { store } from "@/state";

vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: ({ visible, children }: any) =>
    visible ? <div data-testid="spinner-overlay">{children}</div> : null,
}));

describe("UpdateEmailAddressForm component", () => {
  const mockUpdateUserEmail = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    store.getActions().user.setUserData({
      uuid: "123",
      username: "testuser",
      email: "original@example.com",
      avatarUrl: null,
      language: "en",
      rootAdmin: true,
      useTotp: false,
      blurSensitiveData: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // Override updateUserEmail action on store
    (store.getState().user as any).updateUserEmail = mockUpdateUserEmail;
  });

  afterEach(cleanup);

  it("renders with the user current email pre-filled and submit disabled", () => {
    const { getByLabelText, getByRole } = render(<UpdateEmailAddressForm />);

    const emailInput = getByLabelText("Email") as HTMLInputElement;
    expect(emailInput.value).toBe("original@example.com");

    const submitBtn = getByRole("button", { name: "Update Email" });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
  });

  it("submits updated email when valid email and password are provided", async () => {
    mockUpdateUserEmail.mockResolvedValue(undefined);

    const { getByLabelText, getByRole } = render(<UpdateEmailAddressForm />);

    const emailInput = getByLabelText("Email");
    const passwordInput = getByLabelText("Confirm Password");
    const submitBtn = getByRole("button", { name: "Update Email" });

    await act(async () => {
      fireEvent.change(emailInput, {
        target: { value: "newemail@example.com" },
      });
      fireEvent.change(passwordInput, { target: { value: "my-password123" } });
    });

    await waitFor(() => {
      expect(submitBtn.hasAttribute("disabled")).toBe(false);
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockUpdateUserEmail).toHaveBeenCalledWith({
      email: "newemail@example.com",
      password: "my-password123",
    });

    const flashes = store.getState().flashes.items;
    expect(
      flashes.some(
        (f) =>
          f.key === "account:email" &&
          f.message === "Your primary email has been updated.",
      ),
    ).toBe(true);
  });

  it("displays flash error message when updateUserEmail fails", async () => {
    mockUpdateUserEmail.mockRejectedValue(
      new Error("Invalid account password entered."),
    );

    const { getByLabelText, getByRole } = render(<UpdateEmailAddressForm />);

    await act(async () => {
      fireEvent.change(getByLabelText("Email"), {
        target: { value: "newemail@example.com" },
      });
      fireEvent.change(getByLabelText("Confirm Password"), {
        target: { value: "wrong-password" },
      });
    });

    await act(async () => {
      fireEvent.click(getByRole("button", { name: "Update Email" }));
    });

    const flashes = store.getState().flashes.items;
    expect(
      flashes.some(
        (f) =>
          f.key === "account:email" &&
          f.message === "Invalid account password entered.",
      ),
    ).toBe(true);
  });
});
