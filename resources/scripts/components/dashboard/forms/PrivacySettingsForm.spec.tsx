import React from "react";
import { render, fireEvent, act, cleanup } from "@testing-library/react";
import PrivacySettingsForm from "./PrivacySettingsForm";
import updateAccountPrivacy from "@/api/account/updateAccountPrivacy";
import { store } from "@/state";

vi.mock("@/api/account/updateAccountPrivacy");

describe("PrivacySettingsForm component", () => {
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

  it("renders with initial switch status matching blurSensitiveData", () => {
    const { getByRole, getByText } = render(<PrivacySettingsForm />);

    expect(getByText("Blur sensitive information")).toBeDefined();

    const switchBtn = getByRole("switch");
    expect(switchBtn.getAttribute("aria-checked")).toBe("false");
  });

  it("toggles privacy setting and updates account via API", async () => {
    (updateAccountPrivacy as any).mockResolvedValue(true);

    const { getByRole, getByText } = render(<PrivacySettingsForm />);

    const switchBtn = getByRole("switch");

    await act(async () => {
      fireEvent.click(switchBtn);
    });

    expect(updateAccountPrivacy).toHaveBeenCalledWith(true);
    expect(store.getState().user.data?.blurSensitiveData).toBe(true);
    expect(getByText("Saved to your account.")).toBeDefined();
  });

  it("rolls back optimistic update and records error if API call rejects", async () => {
    (updateAccountPrivacy as any).mockRejectedValue(
      new Error("Failed to save privacy preference"),
    );

    const { getByRole } = render(<PrivacySettingsForm />);

    const switchBtn = getByRole("switch");

    await act(async () => {
      fireEvent.click(switchBtn);
    });

    expect(updateAccountPrivacy).toHaveBeenCalledWith(true);
    // Rolled back to false
    expect(store.getState().user.data?.blurSensitiveData).toBe(false);

    const flashes = store.getState().flashes.items;
    expect(flashes.some((f) => f.key === "account:privacy")).toBe(true);
  });

  it("displays Saving... state while request is pending and handles string error", async () => {
    let rejectPromise: (err: any) => void;
    (updateAccountPrivacy as any).mockImplementationOnce(
      () =>
        new Promise((_, rej) => {
          rejectPromise = rej;
        }),
    );

    const { getByRole, getByText } = render(<PrivacySettingsForm />);
    const switchBtn = getByRole("switch");

    act(() => {
      fireEvent.click(switchBtn);
    });

    expect(getByText("Saving...")).toBeDefined();

    await act(async () => {
      rejectPromise!("Network Failure String");
    });

    const flashes = store.getState().flashes.items;
    expect(flashes.some((f) => f.key === "account:privacy")).toBe(true);
  });
});
