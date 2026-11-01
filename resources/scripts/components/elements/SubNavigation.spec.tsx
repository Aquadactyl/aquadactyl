import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SubNavigation from "./SubNavigation";

describe("components/elements/SubNavigation", () => {
  it("renders with custom className and spreads HTML attributes", () => {
    const { container } = render(
      <SubNavigation
        id="test-subnav"
        className="custom-class"
        data-testid="subnav"
      >
        <div>
          <a href="/test">Link</a>
        </div>
      </SubNavigation>,
    );

    const el = container.querySelector("#test-subnav");
    expect(el).toBeTruthy();
    expect(el?.classList.contains("custom-class")).toBe(true);
    expect(screen.getByText("Link")).toBeTruthy();
    expect(SubNavigation.displayName).toBe("SubNavigation");
  });
});
