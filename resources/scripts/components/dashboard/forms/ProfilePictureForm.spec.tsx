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
});
