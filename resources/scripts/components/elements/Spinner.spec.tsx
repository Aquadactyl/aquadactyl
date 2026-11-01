import { render, screen } from "@testing-library/react";
import React, { lazy } from "react";
import { describe, expect, it } from "vitest";
import Spinner from "./Spinner";

describe("components/elements/Spinner", () => {
  it("renders non-centered and centered spinner with various sizes and blue variant", () => {
    const { rerender } = render(<Spinner isBlue className="test-spinner" />);
    let el = screen.getByRole("status");
    expect(el.className).toContain("border-primary-500/20");
    expect(el.className).toContain("test-spinner");

    rerender(<Spinner centered size={Spinner.Size.LARGE} />);
    el = screen.getByRole("status");
    expect(el.parentElement?.className).toContain("m-20");

    rerender(<Spinner centered size={Spinner.Size.SMALL} />);
    el = screen.getByRole("status");
    expect(el.parentElement?.className).toContain("m-6");
  });

  it("renders Spinner.Suspense with fallback and content", async () => {
    const LazyComponent = lazy(
      () =>
        new Promise<{ default: React.FC }>((resolve) =>
          setTimeout(
            () => resolve({ default: () => <div>Loaded Content</div> }),
            10,
          ),
        ),
    );

    render(
      <Spinner.Suspense>
        <LazyComponent />
      </Spinner.Suspense>,
    );

    expect(screen.getByRole("status")).toBeDefined();
    expect(await screen.findByText("Loaded Content")).toBeDefined();
  });
});
