import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import RecoveryTokensDialog from "./RecoveryTokensDialog";

describe("components/dashboard/forms/RecoveryTokensDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders paired tokens and handles close", () => {
    const onClose = vi.fn();
    const tokens = ["code-1", "code-2", "code-3"];

    render(
      <RecoveryTokensDialog
        open
        tokens={tokens}
        onClose={onClose}
        title="Custom Recovery Title"
        description="Custom Description"
      />,
    );

    expect(screen.getByText("Custom Recovery Title")).toBeTruthy();
    expect(screen.getByText("Custom Description")).toBeTruthy();
    expect(screen.getByText(/code-1/)).toBeTruthy();
    expect(screen.getByText(/code-2/)).toBeTruthy();
    expect(screen.getByText(/code-3/)).toBeTruthy();

    const doneBtn = screen.getByRole("button", { name: /done/i });
    fireEvent.click(doneBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("handles token download click and default translations", () => {
    const createObjectURL = vi.fn(() => "blob:http://localhost/token-file");
    const revokeObjectURL = vi.fn();
    globalThis.URL.createObjectURL = createObjectURL;
    globalThis.URL.revokeObjectURL = revokeObjectURL;

    render(
      <RecoveryTokensDialog
        open
        tokens={["token-a", "token-b"]}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Two-Step Authentication Enabled")).toBeTruthy();

    const downloadBtn = screen.getByRole("button", {
      name: /download as \.txt/i,
    });
    fireEvent.click(downloadBtn);

    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith(
      "blob:http://localhost/token-file",
    );
  });
});
