import React from "react";
import { render, fireEvent, cleanup } from "@testing-library/react";
import ConfigureTwoFactorForm from "./ConfigureTwoFactorForm";
import { store } from "@/state";

vi.mock("@/components/dashboard/forms/SetupTOTPDialog", () => ({
  default: ({ open, onTokens, onClose }: any) =>
    open ? (
      <div data-testid="setup-totp-dialog">
        <button onClick={() => onTokens(["code-1", "code-2"])}>
          Finish Setup
        </button>
        <button onClick={onClose}>Cancel Setup</button>
      </div>
    ) : null,
}));

vi.mock("@/components/dashboard/forms/RecoveryTokensDialog", () => ({
  default: ({ open, tokens, onClose }: any) =>
    open ? (
      <div data-testid="recovery-tokens-dialog">
        <span>Recovery Tokens: {tokens.join(",")}</span>
        <button onClick={onClose}>Close Recovery</button>
      </div>
    ) : null,
}));

vi.mock("@/components/dashboard/forms/DisableTOTPDialog", () => ({
  default: ({ open, onClose }: any) =>
    open ? (
      <div data-testid="disable-totp-dialog">
        <button onClick={onClose}>Cancel Disable</button>
      </div>
    ) : null,
}));

vi.mock("@/components/dashboard/forms/RegenerateRecoveryTokensDialog", () => ({
  default: ({ open, onTokens, onClose }: any) =>
    open ? (
      <div data-testid="regenerate-tokens-dialog">
        <button onClick={() => onTokens(["regen-1", "regen-2"])}>
          Confirm Regenerate
        </button>
        <button onClick={onClose}>Cancel Regenerate</button>
      </div>
    ) : null,
}));

describe("ConfigureTwoFactorForm component", () => {
  const setUserTotp = (useTotp: boolean) => {
    store.getActions().user.setUserData({
      uuid: "123",
      username: "testuser",
      email: "test@example.com",
      avatarUrl: null,
      language: "en",
      rootAdmin: true,
      useTotp,
      blurSensitiveData: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  afterEach(cleanup);

  it("renders disabled state with Enable button and opens setup dialog", () => {
    setUserTotp(false);

    const { getByText, getByRole, queryByTestId, getByTestId } = render(
      <ConfigureTwoFactorForm />,
    );

    expect(
      getByText(/You do not currently have two-step verification enabled/),
    ).toBeDefined();

    const enableBtn = getByRole("button", { name: "Enable Two-Step" });
    expect(queryByTestId("setup-totp-dialog")).toBeNull();

    fireEvent.click(enableBtn);
    expect(getByTestId("setup-totp-dialog")).toBeDefined();

    // Completing setup shows recovery tokens dialog
    fireEvent.click(getByText("Finish Setup"));
    expect(getByTestId("recovery-tokens-dialog")).toBeDefined();
    expect(getByText("Recovery Tokens: code-1,code-2")).toBeDefined();

    // Closing recovery tokens resets tokens and hides dialog
    fireEvent.click(getByText("Close Recovery"));
    expect(queryByTestId("recovery-tokens-dialog")).toBeNull();

    // Reopen setup and cancel
    fireEvent.click(enableBtn);
    expect(getByTestId("setup-totp-dialog")).toBeDefined();
    fireEvent.click(getByText("Cancel Setup"));
    expect(queryByTestId("setup-totp-dialog")).toBeNull();
  });

  it("renders enabled state with Disable and Regenerate buttons", () => {
    setUserTotp(true);

    const { getByText, getByRole, queryByTestId, getByTestId } = render(
      <ConfigureTwoFactorForm />,
    );

    expect(
      getByText(/Two-step verification is currently enabled/),
    ).toBeDefined();

    const disableBtn = getByRole("button", { name: "Disable Two-Step" });
    const regenBtn = getByRole("button", { name: "Regenerate Backup Codes" });

    // Open disable dialog
    fireEvent.click(disableBtn);
    expect(getByTestId("disable-totp-dialog")).toBeDefined();

    fireEvent.click(getByText("Cancel Disable"));
    expect(queryByTestId("disable-totp-dialog")).toBeNull();

    // Open regenerate dialog and cancel
    fireEvent.click(regenBtn);
    expect(getByTestId("regenerate-tokens-dialog")).toBeDefined();
    fireEvent.click(getByText("Cancel Regenerate"));
    expect(queryByTestId("regenerate-tokens-dialog")).toBeNull();

    // Open regenerate dialog again and confirm
    fireEvent.click(regenBtn);
    expect(getByTestId("regenerate-tokens-dialog")).toBeDefined();

    // Emitting tokens opens recovery dialog
    fireEvent.click(getByText("Confirm Regenerate"));
    expect(getByTestId("recovery-tokens-dialog")).toBeDefined();
    expect(getByText("Recovery Tokens: regen-1,regen-2")).toBeDefined();

    // Close recovery dialog
    fireEvent.click(getByText("Close Recovery"));
    expect(queryByTestId("recovery-tokens-dialog")).toBeNull();
  });
});
