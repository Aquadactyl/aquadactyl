import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import SpinnerOverlay from "./SpinnerOverlay";

describe("components/elements/SpinnerOverlay", () => {
  it("renders visible spinner overlay with fixed, custom backgroundOpacity and string message", () => {
    const { container } = render(
      <SpinnerOverlay visible fixed backgroundOpacity={0.8}>
        Loading data…
      </SpinnerOverlay>,
    );

    expect(screen.getByText("Loading data…")).toBeDefined();
    const overlay = container.querySelector(".fixed");
    expect(overlay).not.toBeNull();
    expect((overlay as HTMLElement).style.background).toContain("0.8");
  });

  it("renders non-fixed overlay with default opacity and JSX children", () => {
    const { container } = render(
      <SpinnerOverlay visible={true}>
        <span data-testid="custom-child">Custom Content</span>
      </SpinnerOverlay>,
    );

    expect(screen.getByTestId("custom-child")).toBeDefined();
    const overlay = container.querySelector(".absolute");
    expect(overlay).not.toBeNull();
    expect((overlay as HTMLElement).style.background).toContain("0.45");
  });

  it("renders without children and hidden when visible is false", () => {
    const { container } = render(<SpinnerOverlay visible={false} />);
    expect(container.querySelector(".absolute")).toBeNull();
  });
});
