import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Checkbox from "./Checkbox";

describe("components/elements/inputs/Checkbox", () => {
  it("renders with checked, indeterminate, disabled, and custom props", () => {
    const onCheckedChange = vi.fn();
    const ref = React.createRef<HTMLButtonElement>();

    const { container, rerender } = render(
      <Checkbox
        ref={ref}
        id="test-checkbox"
        name="test_name"
        value="1"
        checked={false}
        className="custom-checkbox"
        onCheckedChange={onCheckedChange}
      />,
    );

    const btn = screen.getByRole("checkbox");
    expect(btn).toBeTruthy();
    expect(btn?.classList.contains("custom-checkbox")).toBe(true);
    expect(
      container
        .querySelector('input[type="checkbox"]')
        ?.getAttribute("value") || btn?.getAttribute("value"),
    ).toBeTruthy();

    if (btn) {
      fireEvent.click(btn);
    }
    expect(onCheckedChange).toHaveBeenCalled();

    rerender(<Checkbox checked={true} indeterminate={true} disabled={true} />);
    expect(
      btn?.hasAttribute("data-disabled") ||
        btn?.getAttribute("aria-disabled") === "true" ||
        btn?.hasAttribute("disabled"),
    ).toBe(true);
  });
});
