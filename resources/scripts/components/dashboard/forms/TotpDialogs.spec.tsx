import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SetupTOTPDialog from "./SetupTOTPDialog";
import DisableTOTPDialog from "./DisableTOTPDialog";
import RegenerateRecoveryTokensDialog from "./RegenerateRecoveryTokensDialog";
import getTwoFactorTokenData from "@/api/account/getTwoFactorTokenData";
import enableAccountTwoFactor from "@/api/account/enableAccountTwoFactor";
import disableAccountTwoFactor from "@/api/account/disableAccountTwoFactor";
import regenerateAccountRecoveryTokens from "@/api/account/regenerateAccountRecoveryTokens";

vi.mock("@/api/account/getTwoFactorTokenData", () => ({
  default: vi.fn().mockResolvedValue({
    secret: "ABCD1234EFGH5678",
    image_url_data: "otpauth://totp/Aquadactyl:user?secret=ABCD1234EFGH5678",
  }),
}));

vi.mock("@/api/account/enableAccountTwoFactor", () => ({
  default: vi.fn().mockResolvedValue(["token-1", "token-2"]),
}));

vi.mock("@/api/account/disableAccountTwoFactor", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/api/account/regenerateAccountRecoveryTokens", () => ({
  default: vi.fn().mockResolvedValue(["rec-1", "rec-2"]),
}));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: () => <svg data-testid="qr-code" />,
}));

vi.mock("@/components/elements/tooltip/Tooltip", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/FlashMessageRender", () => ({
  default: () => null,
}));

vi.mock("@/components/elements/dialog", async () => {
  const actual: any = await vi.importActual("@/components/elements/dialog");
  const MockDialog = ({ open, children }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null;
  MockDialog.Footer = ({ children }: any) => <div>{children}</div>;
  return {
    ...actual,
    Dialog: MockDialog,
  };
});

vi.mock("@/plugins/useFlash", () => ({
  useFlashKey: () => ({
    clearAndAddHttpError: vi.fn(),
  }),
}));

const mockUpdateUserData = vi.fn();
vi.mock("@/state", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAppStore: (selector: any) =>
      selector({
        user: {
          updateUserData: mockUpdateUserData,
          data: { blurSensitiveData: false },
        },
        settings: {
          data: { features: { privacyMode: true } },
        },
      }),
  };
});

describe("components/dashboard/forms TOTP Dialogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SetupTOTPDialog", () => {
    it("loads QR code and enables 2FA on form submission", async () => {
      const onTokens = vi.fn();
      const onClose = vi.fn();

      render(
        <SetupTOTPDialog open={true} onClose={onClose} onTokens={onTokens} />,
      );

      await waitFor(() => {
        expect(getTwoFactorTokenData).toHaveBeenCalled();
        expect(screen.getByTestId("qr-code")).toBeDefined();
      });

      const codeInput = screen.getByLabelText("Authentication Code");
      const passwordInput = screen.getByLabelText("Account Password");

      fireEvent.change(codeInput, { target: { value: "123456" } });
      fireEvent.change(passwordInput, { target: { value: "secret123" } });

      const enableBtn = screen.getByRole("button", { name: "Enable" });
      fireEvent.click(enableBtn);

      await waitFor(() => {
        expect(enableAccountTwoFactor).toHaveBeenCalledWith(
          "123456",
          "secret123",
        );
        expect(mockUpdateUserData).toHaveBeenCalledWith({ useTotp: true });
        expect(onTokens).toHaveBeenCalledWith(["token-1", "token-2"]);
      });
    });

    it("handles error loading token data and cancel click", async () => {
      vi.mocked(getTwoFactorTokenData).mockRejectedValueOnce(
        new Error("Network Error"),
      );
      const onClose = vi.fn();

      render(
        <SetupTOTPDialog open={true} onClose={onClose} onTokens={vi.fn()} />,
      );

      await waitFor(() => {
        expect(getTwoFactorTokenData).toHaveBeenCalled();
      });

      // Click cancel
      const cancelBtn = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it("handles submit failure when enabling 2FA", async () => {
      const onClose = vi.fn();
      vi.mocked(getTwoFactorTokenData).mockResolvedValueOnce({
        secret: "ABCD1234EFGH5678",
        image_url_data: "otpauth://test",
      });
      vi.mocked(enableAccountTwoFactor).mockRejectedValueOnce(
        new Error("Invalid Code"),
      );

      render(
        <SetupTOTPDialog open={true} onClose={onClose} onTokens={vi.fn()} />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeDefined();
      });

      fireEvent.change(screen.getByLabelText("Authentication Code"), {
        target: { value: "123456" },
      });
      fireEvent.change(screen.getByLabelText("Account Password"), {
        target: { value: "secret123" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Enable" }));

      await waitFor(() => {
        expect(enableAccountTwoFactor).toHaveBeenCalled();
      });
    });

    it("ignores submission when already submitting", async () => {
      let resolveEnable: any;
      vi.mocked(getTwoFactorTokenData).mockResolvedValueOnce({
        secret: "ABCD",
        image_url_data: "otpauth://test",
      });
      vi.mocked(enableAccountTwoFactor).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveEnable = resolve;
          }),
      );

      const { container } = render(
        <SetupTOTPDialog open={true} onClose={vi.fn()} onTokens={vi.fn()} />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("qr-code")).toBeDefined();
      });

      fireEvent.change(screen.getByLabelText("Authentication Code"), {
        target: { value: "123456" },
      });
      fireEvent.change(screen.getByLabelText("Account Password"), {
        target: { value: "secret123" },
      });

      const form = container.querySelector("#enable-totp-form")!;
      fireEvent.submit(form);
      expect(enableAccountTwoFactor).toHaveBeenCalledTimes(1);

      // Fire submit again while submitting is true
      fireEvent.submit(form);
      expect(enableAccountTwoFactor).toHaveBeenCalledTimes(1);

      resolveEnable(["token-1"]);
    });
  });

  describe("DisableTOTPDialog", () => {
    it("disables 2FA when valid password is submitted", async () => {
      const onClose = vi.fn();

      render(<DisableTOTPDialog open={true} onClose={onClose} />);

      const passwordInput = screen.getByLabelText("Password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });

      const disableBtn = screen.getByRole("button", { name: "Disable" });
      fireEvent.click(disableBtn);

      await waitFor(() => {
        expect(disableAccountTwoFactor).toHaveBeenCalledWith("password123");
        expect(mockUpdateUserData).toHaveBeenCalledWith({ useTotp: false });
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("ignores submission when already submitting", async () => {
      let resolveDisable: any;
      vi.mocked(disableAccountTwoFactor).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveDisable = resolve;
          }),
      );

      const { container } = render(
        <DisableTOTPDialog open={true} onClose={vi.fn()} />,
      );

      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "password123" },
      });

      const form = container.querySelector("#disable-totp-form")!;
      fireEvent.submit(form);
      expect(disableAccountTwoFactor).toHaveBeenCalledTimes(1);

      // Fire submit again while submitting is true
      fireEvent.submit(form);
      expect(disableAccountTwoFactor).toHaveBeenCalledTimes(1);

      resolveDisable();
    });

    it("handles cancel button and failure to disable 2FA", async () => {
      const onClose = vi.fn();
      vi.mocked(disableAccountTwoFactor).mockRejectedValueOnce(
        new Error("Wrong password"),
      );

      render(<DisableTOTPDialog open={true} onClose={onClose} />);

      // Cancel button
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClose).toHaveBeenCalled();

      // Submit error
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "wrong" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Disable" }));

      await waitFor(() => {
        expect(disableAccountTwoFactor).toHaveBeenCalledWith("wrong");
      });
    });
  });

  describe("RegenerateRecoveryTokensDialog", () => {
    it("regenerates recovery tokens when password is submitted", async () => {
      const onTokens = vi.fn();
      const onClose = vi.fn();

      render(
        <RegenerateRecoveryTokensDialog
          open={true}
          onClose={onClose}
          onTokens={onTokens}
        />,
      );

      const passwordInput = screen.getByLabelText("Password");
      fireEvent.change(passwordInput, { target: { value: "mypassword" } });

      const regenBtn = screen.getByRole("button", { name: "Regenerate Codes" });
      fireEvent.click(regenBtn);

      await waitFor(() => {
        expect(regenerateAccountRecoveryTokens).toHaveBeenCalledWith(
          "mypassword",
        );
        expect(onTokens).toHaveBeenCalledWith(["rec-1", "rec-2"]);
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("ignores submission when already submitting", async () => {
      let resolveRegen: any;
      vi.mocked(regenerateAccountRecoveryTokens).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRegen = resolve;
          }),
      );

      const { container } = render(
        <RegenerateRecoveryTokensDialog
          open={true}
          onClose={vi.fn()}
          onTokens={vi.fn()}
        />,
      );

      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "mypassword" },
      });

      const form = container.querySelector("#regenerate-tokens-form")!;
      fireEvent.submit(form);
      expect(regenerateAccountRecoveryTokens).toHaveBeenCalledTimes(1);

      // Fire submit again while submitting is true
      fireEvent.submit(form);
      expect(regenerateAccountRecoveryTokens).toHaveBeenCalledTimes(1);

      resolveRegen(["rec-1"]);
    });

    it("handles cancel button and error when regenerating tokens", async () => {
      const onClose = vi.fn();
      vi.mocked(regenerateAccountRecoveryTokens).mockRejectedValueOnce(
        new Error("Auth failed"),
      );

      render(
        <RegenerateRecoveryTokensDialog
          open={true}
          onClose={onClose}
          onTokens={vi.fn()}
        />,
      );

      // Cancel
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onClose).toHaveBeenCalled();

      // Submit error
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "badpass" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Regenerate Codes" }));

      await waitFor(() => {
        expect(regenerateAccountRecoveryTokens).toHaveBeenCalledWith("badpass");
      });
    });
  });
});
