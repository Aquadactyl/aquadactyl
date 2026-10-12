import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import DeleteSSHKeyButton from "./DeleteSSHKeyButton";
import { deleteSSHKey } from "@/api/account/ssh-keys";

const mockMutate = vi.fn().mockResolvedValue(undefined);
const mockClearAndAddHttpError = vi.fn();

vi.mock("@/plugins/useFlash", () => ({
  useFlashKey: () => ({
    clearAndAddHttpError: mockClearAndAddHttpError,
  }),
}));

vi.mock("@/api/account/ssh-keys", () => ({
  deleteSSHKey: vi.fn(),
  useSSHKeys: () => ({
    mutate: mockMutate,
  }),
}));

describe("components/dashboard/ssh/DeleteSSHKeyButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens confirmation dialog and deletes key successfully", async () => {
    vi.mocked(deleteSSHKey).mockResolvedValueOnce(undefined as any);

    render(
      <DeleteSSHKeyButton
        name="My Key"
        fingerprint="SHA256:target-fingerprint"
      />,
    );

    const openBtn = screen.getByRole("button");
    fireEvent.click(openBtn);

    expect(screen.getByText("Delete SSH Key")).toBeTruthy();
    expect(screen.getByText("My Key")).toBeTruthy();

    const confirmBtn = screen.getByRole("button", { name: "Delete Key" });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(deleteSSHKey).toHaveBeenCalledWith("SHA256:target-fingerprint");
    expect(mockMutate).toHaveBeenCalled();

    // Verify optimistic updater
    const updater = mockMutate.mock.calls[0][0];
    const initialList = [
      { fingerprint: "SHA256:target-fingerprint" },
      { fingerprint: "SHA256:other" },
    ];
    expect(updater(initialList)).toEqual([{ fingerprint: "SHA256:other" }]);
    expect(updater(undefined)).toBeUndefined();
  });

  it("closes confirmation dialog when cancelled", async () => {
    render(
      <DeleteSSHKeyButton
        name="My Key"
        fingerprint="SHA256:target-fingerprint"
      />,
    );

    const openBtn = screen.getByRole("button");
    fireEvent.click(openBtn);

    expect(screen.getByText("Delete SSH Key")).toBeTruthy();

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText("Delete SSH Key")).toBeNull();
    });
  });

  it("handles deletion failure and rolls back state even if rollback rejects", async () => {
    const error = new Error("Failed to delete key");
    vi.mocked(deleteSSHKey).mockRejectedValueOnce(error);
    mockMutate.mockResolvedValueOnce(undefined);
    mockMutate.mockRejectedValueOnce(new Error("Rollback failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <DeleteSSHKeyButton
        name="My Key"
        fingerprint="SHA256:target-fingerprint"
      />,
    );

    const openBtn = screen.getByRole("button");
    fireEvent.click(openBtn);

    const confirmBtn = screen.getByRole("button", { name: "Delete Key" });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockClearAndAddHttpError).toHaveBeenCalledWith(error);
      expect(mockMutate).toHaveBeenCalledWith(undefined, true);
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });
});
