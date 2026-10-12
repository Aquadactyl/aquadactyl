import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import AccountApiContainer from "./AccountApiContainer";
import getApiKeys, { ApiKey } from "@/api/account/getApiKeys";
import deleteApiKey from "@/api/account/deleteApiKey";
import { store } from "@/state";

vi.mock("@/api/account/getApiKeys");
vi.mock("@/api/account/deleteApiKey");

vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: () => null,
}));
vi.mock("@/components/dashboard/forms/CreateApiKeyForm", () => ({
  default: ({ onKeyCreated }: any) => (
    <div>
      CreateApiKeyForm
      <button
        onClick={() =>
          onKeyCreated({
            identifier: "new-key-678",
            description: "Second Key",
            allowedIps: [],
            createdAt: new Date(),
            lastUsedAt: new Date("2026-02-01T10:00:00Z"),
          })
        }
      >
        Trigger Key Created
      </button>
    </div>
  ),
}));

vi.mock("@blueprint/components/Account/API/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Account/API/AfterContent", () => ({
  default: () => null,
}));

vi.mock("@/components/elements/dialog", () => ({
  Dialog: {
    Confirm: ({ open, onConfirmed, onClose, children, confirm }: any) =>
      open ? (
        <div data-testid="confirm-dialog">
          {children}
          <button onClick={onConfirmed}>{confirm || "Confirm"}</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      ) : null,
  },
}));

const mockApiKeys: ApiKey[] = [
  {
    identifier: "key-12345",
    description: "Backup Script Key",
    allowedIps: ["127.0.0.1"],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    lastUsedAt: null,
  },
];

describe("components/dashboard/AccountApiContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.getActions().settings.setSettings({
      name: "Pterodactyl",
      locale: "en",
      recaptcha: { enabled: false, siteKey: "" },
      blueprint: { disable_attribution: true },
    } as any);

    vi.mocked(getApiKeys).mockResolvedValue(mockApiKeys);
  });

  it("renders API keys list and form, and supports adding a new key", async () => {
    render(<AccountApiContainer />);

    expect(await screen.findByText("Backup Script Key")).toBeDefined();
    expect(screen.getByText("key-12345")).toBeDefined();
    expect(screen.getByText(/Never/)).toBeDefined();

    // Trigger onKeyCreated
    fireEvent.click(
      screen.getByRole("button", { name: "Trigger Key Created" }),
    );

    expect(await screen.findByText("Second Key")).toBeDefined();
    expect(screen.getByText("new-key-678")).toBeDefined();
    expect(screen.getByText(/Feb 1st, 2026/)).toBeDefined();
  });

  it("opens delete confirmation, cancels it, and deletes API key with error handling", async () => {
    vi.mocked(deleteApiKey).mockResolvedValueOnce(undefined as any);

    const { container } = render(<AccountApiContainer />);

    await screen.findByText("Backup Script Key");
    const trashButton = container
      .querySelector(".lucide-trash-2")
      ?.closest("button");
    expect(trashButton).toBeDefined();

    // Open and cancel
    fireEvent.click(trashButton!);
    expect(screen.getByTestId("confirm-dialog")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByTestId("confirm-dialog")).toBeNull();

    // Open and confirm
    fireEvent.click(trashButton!);
    const confirmBtn = screen.getByRole("button", { name: "Delete Key" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteApiKey).toHaveBeenCalledWith("key-12345");
      expect(screen.queryByText("Backup Script Key")).toBeNull();
    });

    // Handle delete failure
    vi.mocked(deleteApiKey).mockRejectedValueOnce(new Error("Delete failed"));
    fireEvent.click(
      screen.getByRole("button", { name: "Trigger Key Created" }),
    );
    expect(await screen.findByText("Second Key")).toBeDefined();

    const secondTrash = container
      .querySelectorAll(".lucide-trash-2")[0]
      ?.closest("button");
    fireEvent.click(secondTrash!);
    fireEvent.click(screen.getByRole("button", { name: "Delete Key" }));
    await waitFor(() => {
      expect(deleteApiKey).toHaveBeenCalledWith("new-key-678");
    });
  });

  it("handles initial load failure and empty state", async () => {
    vi.mocked(getApiKeys).mockRejectedValueOnce(new Error("Load failed"));
    const { unmount } = render(<AccountApiContainer />);

    await waitFor(() => {
      expect(getApiKeys).toHaveBeenCalled();
    });
    unmount();

    vi.mocked(getApiKeys).mockResolvedValueOnce([]);
    render(<AccountApiContainer />);

    expect(
      await screen.findByText("No API keys exist for this account."),
    ).toBeDefined();
  });
});
