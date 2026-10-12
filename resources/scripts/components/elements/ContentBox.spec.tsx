import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ContentBox from "./ContentBox";

vi.mock("@/components/FlashMessageRender", () => ({
  default: ({ byKey }: { byKey?: string }) => (
    <div data-testid="flash-render" data-bykey={byKey}>
      FlashRender
    </div>
  ),
}));

vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: ({ visible }: { visible: boolean }) => (
    <div data-testid="spinner-overlay" data-visible={String(visible)}>
      Spinner
    </div>
  ),
}));

describe("components/elements/ContentBox", () => {
  it("renders with title, description, border color, loading overlay, string showFlashes, and children", () => {
    const { container } = render(
      <ContentBox
        title="Settings Box"
        description="Configure your settings"
        borderColor="blue"
        showLoadingOverlay={true}
        showFlashes="settings"
      >
        <span>Content body</span>
      </ContentBox>,
    );

    expect(screen.getByText("Settings Box")).toBeDefined();
    expect(screen.getByText("Configure your settings")).toBeDefined();
    expect(screen.getByText("Content body")).toBeDefined();
    expect(container.querySelector(".border-t-4")).not.toBeNull();
    expect(
      screen.getByTestId("spinner-overlay").getAttribute("data-visible"),
    ).toBe("true");
    const flash = screen.getByTestId("flash-render");
    expect(flash.getAttribute("data-bykey")).toBe("settings");
  });

  it("renders minimal without title, description, borderColor, and with boolean showFlashes", () => {
    const { container } = render(
      <ContentBox showFlashes={true}>
        <span>Minimal body</span>
      </ContentBox>,
    );

    expect(screen.queryByRole("heading")).toBeNull();
    expect(container.querySelector(".content-box-description")).toBeNull();
    expect(container.querySelector(".border-t-4")).toBeNull();
    expect(
      screen.getByTestId("spinner-overlay").getAttribute("data-visible"),
    ).toBe("false");
    const flash = screen.getByTestId("flash-render");
    expect(flash.getAttribute("data-bykey")).toBeNull();
  });

  it("renders without flashes when showFlashes is falsy", () => {
    render(
      <ContentBox showFlashes={false}>
        <span>No flashes</span>
      </ContentBox>,
    );

    expect(screen.queryByTestId("flash-render")).toBeNull();
  });
});
