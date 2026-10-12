import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import FlashMessageRender from "./FlashMessageRender";

let mockFlashes: any[] = [];
vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      flashes: {
        items: mockFlashes,
      },
    }),
}));

describe("components/FlashMessageRender", () => {
  beforeEach(() => {
    mockFlashes = [];
  });

  it("renders null when there are no flashes matching", () => {
    const { container } = render(<FlashMessageRender />);
    expect(container.firstChild).toBeNull();
  });

  it("filters flashes byKey and renders matching items", () => {
    mockFlashes = [
      {
        id: "flash-1",
        key: "account",
        type: "info",
        title: "Account Notice",
        message: "Your profile was updated.",
      },
      {
        id: "flash-2",
        key: "other-key",
        type: "error",
        title: "Error",
        message: "Another error.",
      },
    ];

    render(<FlashMessageRender byKey="account" className="custom-class" />);

    expect(screen.getByText("Your profile was updated.")).toBeDefined();
    expect(screen.queryByText("Another error.")).toBeNull();
  });

  it("renders multiple flashes without id, covering mt-2 spacer and key fallback", () => {
    mockFlashes = [
      {
        key: "general",
        type: "success",
        title: "Success",
        message: "Saved successfully.",
      },
      {
        key: "general",
        type: "warning",
        title: "Warning",
        message: "Check settings.",
      },
    ];

    const { container } = render(<FlashMessageRender />);

    expect(screen.getByText("Saved successfully.")).toBeDefined();
    expect(screen.getByText("Check settings.")).toBeDefined();
    expect(container.querySelector(".mt-2")).not.toBeNull();
  });
});
