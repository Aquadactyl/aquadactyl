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
  default: () => <div>CreateApiKeyForm</div>,
}));

vi.mock("@blueprint/components/Account/API/BeforeContent", () => ({
  default: () => null,
}));
vi.mock("@blueprint/components/Account/API/AfterContent", () => ({
  default: () => null,
}));

vi.mock("@/components/elements/dialog", () => ({
  Dialog: {
    Confirm: ({ open, onConfirmed, children, confirm }: any) =>
      open ? (
        <div data-testid="confirm-dialog">
          {children}
          <button onClick={onConfirmed}>{confirm || "Confirm"}</button>
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

  it("renders API keys list and form", async () => {
    render(<AccountApiContainer />);

    expect(await screen.findByText("Backup Script Key")).toBeDefined();
    expect(screen.getByText("key-12345")).toBeDefined();
    expect(screen.getByText("CreateApiKeyForm")).toBeDefined();
  });

  it("opens delete confirmation and deletes API key", async () => {
    vi.mocked(deleteApiKey).mockResolvedValueOnce(undefined as any);

    const { container } = render(<AccountApiContainer />);

    await screen.findByText("Backup Script Key");
    const trashButton = container
      .querySelector(".lucide-trash-2")
      ?.closest("button");
    expect(trashButton).toBeDefined();
    fireEvent.click(trashButton!);

    expect(screen.getByTestId("confirm-dialog")).toBeDefined();

    const confirmBtn = screen.getByRole("button", { name: "Delete Key" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteApiKey).toHaveBeenCalledWith("key-12345");
      expect(screen.queryByText("Backup Script Key")).toBeNull();
    });
  });
});
