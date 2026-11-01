import { fireEvent, render, screen } from "@testing-library/react";
import React, { createRef } from "react";
import { describe, expect, it } from "vitest";
import InputField from "./InputField";
import { Input } from "./index";

describe("components/elements/inputs/InputField", () => {
  it("renders regular text input with default and loose variant", () => {
    const { rerender } = render(<InputField placeholder="Username" />);
    const input = screen.getByPlaceholderText("Username");
    expect(input).toBeDefined();
    expect(input.className).toContain("px-4 py-2");

    rerender(
      <InputField placeholder="Username" variant={InputField.Variants.Loose} />,
    );
    expect(screen.getByPlaceholderText("Username").className).toContain(
      "px-6 py-3",
    );
  });

  it("renders password input and toggles reveal state", () => {
    const { rerender } = render(
      <InputField type="password" placeholder="Password" />,
    );
    expect(screen.getByPlaceholderText("Password").className).toContain(
      "px-4 py-2",
    );

    rerender(
      <InputField
        type="password"
        placeholder="Password"
        variant={InputField.Variants.Loose}
      />,
    );

    const input = screen.getByPlaceholderText("Password") as HTMLInputElement;
    expect(input.type).toBe("password");
    expect(input.className).toContain("px-6 py-3");

    const toggleButton = screen.getByRole("button", {
      name: "Show password",
    });
    expect(toggleButton.getAttribute("aria-pressed")).toBe("false");

    // Toggle reveal
    fireEvent.click(toggleButton);
    expect(input.type).toBe("text");
    expect(toggleButton.getAttribute("aria-label")).toBe("Hide password");
    expect(toggleButton.getAttribute("aria-pressed")).toBe("true");

    // Toggle back
    fireEvent.click(toggleButton);
    expect(input.type).toBe("password");
    expect(toggleButton.getAttribute("aria-label")).toBe("Show password");
    expect(toggleButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders password input without toggle when hidePasswordToggle is true", () => {
    render(
      <InputField
        type="password"
        placeholder="Hidden Toggle"
        hidePasswordToggle={true}
      />,
    );

    const input = screen.getByPlaceholderText("Hidden Toggle");
    expect(input).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("forwards ref to HTMLInputElement", () => {
    const ref = createRef<HTMLInputElement>();
    render(<InputField ref={ref} placeholder="Ref Input" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("exports Input.Text and Input.Checkbox on Input object", () => {
    expect(Input.Text).toBe(InputField);
    expect(Input.Checkbox).toBeDefined();
  });
});
