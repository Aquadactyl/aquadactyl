import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AccountSignInMethods from "./AccountSignInMethods";
import {
  getAccountSecurity,
  linkOAuthProvider,
  passkeysSupported,
  registerPasskey,
  removeSignInMethod,
} from "@/api/account/security";

vi.mock("@/api/account/security", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/api/account/security")>();
  return {
    ...actual,
    getAccountSecurity: vi.fn(),
    linkOAuthProvider: vi.fn(),
    passkeysSupported: vi.fn(),
    registerPasskey: vi.fn(),
    removeSignInMethod: vi.fn(),
  };
});

const mockSecurityData = {
  passkeys_enabled: true,
  passkeys: [
    {
      id: "pk-1",
      name: "My MacBook",
      last_used_at: "2026-01-01T12:00:00Z",
    },
    {
      id: "pk-2",
      name: "YubiKey",
      last_used_at: null,
    },
  ],
  providers: [
    { id: "github", label: "GitHub" },
    { id: "google", label: "Google" },
  ],
  identities: [{ id: "id-1", provider: "github", display_name: "octocat" }],
  error: "",
  notice: "",
};

describe("components/dashboard/forms/AccountSignInMethods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(passkeysSupported).mockReturnValue(true);
  });

  it("renders messages only when no methods enabled", async () => {
    vi.mocked(getAccountSecurity).mockResolvedValueOnce({
      passkeys_enabled: false,
      passkeys: [],
      providers: [],
      identities: [],
      error: "Disabled feature error",
      notice: "Special Notice",
    } as any);

    render(<AccountSignInMethods />);

    await waitFor(() => {
      expect(screen.getByText("Disabled feature error")).toBeDefined();
      expect(screen.getByText("Special Notice")).toBeDefined();
    });
    expect(screen.queryByText("Confirm your current password")).toBeNull();
  });

  it("handles mount refresh error", async () => {
    vi.mocked(getAccountSecurity).mockRejectedValueOnce(
      new Error("Security API Failed"),
    );

    render(<AccountSignInMethods />);

    await waitFor(() => {
      expect(screen.getByText("Security API Failed")).toBeDefined();
    });
  });

  it("renders passkeys and OAuth sections and warns when password is empty", async () => {
    vi.mocked(getAccountSecurity).mockResolvedValueOnce(
      mockSecurityData as any,
    );

    render(<AccountSignInMethods />);

    await waitFor(() => {
      expect(screen.getByText("Passkeys and connected accounts")).toBeDefined();
      expect(screen.getByText("My MacBook")).toBeDefined();
      expect(screen.getByText("Not used to sign in yet")).toBeDefined();
      expect(screen.getByText("octocat")).toBeDefined();
      expect(screen.getByText("Link Google")).toBeDefined();
    });

    // Try to click remove passkey without password
    const removeBtn = screen.getByRole("button", {
      name: "Remove passkey My MacBook",
    });
    fireEvent.click(removeBtn);

    expect(
      screen.getByText(
        "Enter your current password to change sign-in methods.",
      ),
    ).toBeDefined();
  });

  it("removes passkey successfully when password is provided", async () => {
    vi.mocked(getAccountSecurity).mockResolvedValue(mockSecurityData as any);
    vi.mocked(removeSignInMethod).mockResolvedValueOnce(undefined as any);

    render(<AccountSignInMethods />);

    await waitFor(() => {
      expect(screen.getByText("My MacBook")).toBeDefined();
    });

    const passInput = screen.getByLabelText("Confirm your current password");
    fireEvent.change(passInput, { target: { value: "mypassword123" } });

    const removeBtn = screen.getByRole("button", {
      name: "Remove passkey My MacBook",
    });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(removeSignInMethod).toHaveBeenCalledWith(
        "passkeys",
        "pk-1",
        "mypassword123",
      );
      expect(screen.getByText("Passkey removed.")).toBeDefined();
    });
  });

  it("registers a new passkey successfully", async () => {
    vi.mocked(getAccountSecurity).mockResolvedValue(mockSecurityData as any);
    vi.mocked(registerPasskey).mockResolvedValueOnce(undefined as any);

    render(<AccountSignInMethods />);

    await waitFor(() => {
      expect(screen.getByLabelText("Passkey name")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Confirm your current password"), {
      target: { value: "mypassword123" },
    });
    fireEvent.change(screen.getByLabelText("Passkey name"), {
      target: { value: "New Phone" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add passkey" }));

    await waitFor(() => {
      expect(registerPasskey).toHaveBeenCalledWith(
        "New Phone",
        "mypassword123",
      );
      expect(screen.getByText("Passkey added.")).toBeDefined();
    });
  });

  it("handles passkeys not supported message and empty passkeys list notice", async () => {
    vi.mocked(passkeysSupported).mockReturnValue(false);
    vi.mocked(getAccountSecurity).mockResolvedValueOnce({
      ...mockSecurityData,
      passkeys: [],
    } as any);

    render(<AccountSignInMethods />);

    await waitFor(() => {
      expect(
        screen.getByText("You haven’t registered any passkeys yet."),
      ).toBeDefined();
      expect(
        screen.getByText(
          "Use a browser and device that support passkeys over HTTPS.",
        ),
      ).toBeDefined();
    });
  });

  it("unlinks connected account and handles error", async () => {
    vi.mocked(getAccountSecurity).mockResolvedValue(mockSecurityData as any);
    vi.mocked(removeSignInMethod).mockRejectedValueOnce(
      new Error("Unlink failed"),
    );

    render(<AccountSignInMethods />);

    await waitFor(() => {
      expect(screen.getByText("octocat")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Confirm your current password"), {
      target: { value: "mypassword123" },
    });

    const unlinkBtn = screen.getByRole("button", { name: "Unlink github" });
    fireEvent.click(unlinkBtn);

    await waitFor(() => {
      expect(removeSignInMethod).toHaveBeenCalledWith(
        "oauth",
        "id-1",
        "mypassword123",
      );
      expect(screen.getByText("Unlink failed")).toBeDefined();
    });
  });

  it("links new OAuth provider successfully", async () => {
    vi.mocked(getAccountSecurity).mockResolvedValue(mockSecurityData as any);
    vi.mocked(linkOAuthProvider).mockResolvedValueOnce(undefined as any);

    render(<AccountSignInMethods />);

    await waitFor(() => {
      expect(screen.getByText("Link Google")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Confirm your current password"), {
      target: { value: "mypassword123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Link Google" }));

    await waitFor(() => {
      expect(linkOAuthProvider).toHaveBeenCalledWith("google", "mypassword123");
    });
  });

  it("renders distinct titles for only passkeys or only OAuth", async () => {
    // Only passkeys
    vi.mocked(getAccountSecurity).mockResolvedValueOnce({
      ...mockSecurityData,
      passkeys_enabled: true,
      providers: [],
      identities: [],
    } as any);

    const { unmount } = render(<AccountSignInMethods />);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "Passkeys" }),
      ).toBeDefined();
    });
    unmount();

    // Only OAuth
    vi.mocked(getAccountSecurity).mockResolvedValueOnce({
      ...mockSecurityData,
      passkeys_enabled: false,
      passkeys: [],
      providers: [{ id: "discord", label: "" }],
      identities: [
        { id: "id-unknown", provider: "discord", display_name: "User#1234" },
      ],
    } as any);

    render(<AccountSignInMethods />);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "Connected accounts" }),
      ).toBeDefined();
      expect(screen.getByText("discord")).toBeDefined();
      expect(screen.getByText("User#1234")).toBeDefined();
    });
  });
});
