import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import Label from "./Label";

describe("components/elements/Label", () => {
  it("renders default label and light mode label", () => {
    const { rerender } = render(<Label>Dark Label</Label>);
    let el = screen.getByText("Dark Label");
    expect(el.tagName).toBe("LABEL");
    expect(el.className).toContain("text-neutral-300");
    expect(el.className).not.toContain("text-neutral-700");

    rerender(<Label isLight>Light Label</Label>);
    el = screen.getByText("Light Label");
    expect(el.className).toContain("text-neutral-700");
  });

  it("supports custom 'as' polymorphic prop and className", () => {
    render(
      <Label as="span" className="custom-label">
        Span Label
      </Label>,
    );
    const el = screen.getByText("Span Label");
    expect(el.tagName).toBe("SPAN");
    expect(el.className).toContain("custom-label");
  });
});
