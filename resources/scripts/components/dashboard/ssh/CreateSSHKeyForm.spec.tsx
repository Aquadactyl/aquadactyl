import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import CreateSSHKeyForm from "./CreateSSHKeyForm";
import { createSSHKey } from "@/api/account/ssh-keys";

const mockMutate = vi.fn();
const mockClearAndAddHttpError = vi.fn();

vi.mock("@/plugins/useFlash", () => ({
  useFlashKey: () => ({
    clearAndAddHttpError: mockClearAndAddHttpError,
  }),
}));

vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: () => null,
}));

vi.mock("@/api/account/ssh-keys", () => ({
  createSSHKey: vi.fn(),
  useSSHKeys: () => ({
    mutate: mockMutate,
  }),
}));

describe("components/dashboard/ssh/CreateSSHKeyForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits valid key data successfully", async () => {
    const createdKey = {
      name: "New Key",
      fingerprint: "SHA256:new123",
      createdAt: new Date(),
    };
    vi.mocked(createSSHKey).mockResolvedValueOnce(createdKey as any);

    render(<CreateSSHKeyForm />);

    const nameInput = screen.getByLabelText("SSH Key Name");
    const keyInput = screen.getByLabelText("Public Key");

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "New Key" } });
      fireEvent.change(keyInput, {
        target: { value: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5..." },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });

    await waitFor(() => {
      expect(createSSHKey).toHaveBeenCalledWith(
        "New Key",
        "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5...",
      );
    });

    expect(mockMutate).toHaveBeenCalled();
    const updater = mockMutate.mock.calls[0][0];
    expect(updater([{ name: "Old" }])).toEqual([{ name: "Old" }, createdKey]);
    expect(updater(null)).toEqual([createdKey]);
  });

  it("handles submission failure", async () => {
    const error = new Error("Invalid SSH key format");
    vi.mocked(createSSHKey).mockRejectedValueOnce(error);

    render(<CreateSSHKeyForm />);

    const nameInput = screen.getByLabelText("SSH Key Name");
    const keyInput = screen.getByLabelText("Public Key");

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Broken Key" } });
      fireEvent.change(keyInput, { target: { value: "invalid-key" } });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });

    await waitFor(() => {
      expect(mockClearAndAddHttpError).toHaveBeenCalledWith(error);
    });
  });
});
