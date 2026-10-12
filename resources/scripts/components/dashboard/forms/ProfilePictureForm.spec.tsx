import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import ProfilePictureForm from "./ProfilePictureForm";
import { store } from "@/state";
import {
  uploadAccountAvatar,
  removeAccountAvatar,
} from "@/api/account/updateAccountAvatar";

vi.mock("@/api/account/updateAccountAvatar");

describe("components/dashboard/forms/ProfilePictureForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi
      .fn()
      .mockReturnValue("blob:http://localhost/mock-avatar");
    globalThis.URL.revokeObjectURL = vi.fn();

    store.getActions().user.setUserData({
      uuid: "usr-1",
      username: "admin",
      email: "admin@test.com",
      language: "en",
      rootAdmin: true,
      useTotp: false,
      gravatar: "",
      avatarUrl: "https://example.com/avatar.png",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  });

  it("renders upload picture and remove picture buttons", () => {
    render(<ProfilePictureForm />);

    expect(
      screen.getByRole("button", { name: "Upload Picture" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Remove Picture" }),
    ).toBeDefined();
  });

  it("handles valid image file selection and uploads avatar", async () => {
    vi.mocked(uploadAccountAvatar).mockResolvedValueOnce(
      "https://example.com/new-avatar.png",
    );

    render(<ProfilePictureForm />);

    const fileInput = screen.getByLabelText("Choose a profile picture");
    const file = new File(["dummy content"], "avatar.png", {
      type: "image/png",
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadBtn = screen.getByRole("button", { name: "Upload Picture" });
    fireEvent.click(uploadBtn);

    await waitFor(() => {
      expect(uploadAccountAvatar).toHaveBeenCalledWith(file);
      expect(store.getState().user.data?.avatarUrl).toBe(
        "https://example.com/new-avatar.png",
      );
    });
  });

  it("handles remove picture action", async () => {
    vi.mocked(removeAccountAvatar).mockResolvedValueOnce(undefined as any);

    render(<ProfilePictureForm />);

    const removeBtn = screen.getByRole("button", { name: "Remove Picture" });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(removeAccountAvatar).toHaveBeenCalled();
      expect(store.getState().user.data?.avatarUrl).toBeNull();
    });
  });

  it("handles empty file selection, invalid type and oversized files", () => {
    render(<ProfilePictureForm />);
    const fileInput = screen.getByLabelText("Choose a profile picture");

    // Empty selection
    fireEvent.change(fileInput, { target: { files: [] } });

    // Invalid file type
    const textFile = new File(["not an image"], "notes.txt", {
      type: "text/plain",
    });
    fireEvent.change(fileInput, { target: { files: [textFile] } });
    expect(
      store.getState().flashes.items.some((f) => f.key === "account:avatar"),
    ).toBe(true);

    // Oversized file
    const bigFile = new File([new ArrayBuffer(3 * 1024 * 1024)], "huge.png", {
      type: "image/png",
    });
    fireEvent.change(fileInput, { target: { files: [bigFile] } });
    expect(
      store.getState().flashes.items.some((f) => f.key === "account:avatar"),
    ).toBe(true);
  });

  it("handles upload failure and remove failure", async () => {
    vi.mocked(uploadAccountAvatar).mockRejectedValueOnce(
      new Error("Upload failed"),
    );
    vi.mocked(removeAccountAvatar).mockRejectedValueOnce(
      new Error("Remove failed"),
    );

    render(<ProfilePictureForm />);
    const fileInput = screen.getByLabelText("Choose a profile picture");
    const file = new File(["dummy"], "avatar.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload Picture" }));

    await waitFor(() => {
      expect(uploadAccountAvatar).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove Picture" }));
    await waitFor(() => {
      expect(removeAccountAvatar).toHaveBeenCalled();
    });
  });

  it("handles non-blob URL creation and revokes URL on unmount", () => {
    vi.mocked(globalThis.URL.createObjectURL).mockReturnValueOnce(
      "http://example.com/not-a-blob",
    );

    const { unmount } = render(<ProfilePictureForm />);
    const fileInput = screen.getByLabelText("Choose a profile picture");
    const file = new File(["dummy"], "avatar.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [file] } });
    unmount();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith(
      "http://example.com/not-a-blob",
    );
  });

  it("handles busy state during upload and remove", async () => {
    let resolveUpload: any;
    vi.mocked(uploadAccountAvatar).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );

    render(<ProfilePictureForm />);
    const fileInput = screen.getByLabelText("Choose a profile picture");
    const file = new File(["dummy"], "avatar.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadBtn = screen.getByRole("button", { name: "Upload Picture" });
    fireEvent.click(uploadBtn);

    // Now busy is true
    expect(screen.getByText("Saving…")).toBeDefined();

    // Upload in flight displays Saving...
    expect(screen.getByText("Saving…")).toBeDefined();

    resolveUpload("https://example.com/avatar.png");
  });
});
