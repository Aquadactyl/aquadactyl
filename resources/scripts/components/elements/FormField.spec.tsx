import { fireEvent, render, screen } from "@testing-library/react";
import React, { createRef } from "react";
import { describe, expect, it } from "vitest";
import FormField from "./FormField";

describe("components/elements/FormField", () => {
  it("renders text field with label, description, custom id and light styling", () => {
    render(
      <FormField
        id="custom-input-id"
        name="username"
        label="Username"
        description="Your unique login name"
        light
      />,
    );

    const input = screen.getByLabelText("Username");
    expect(input.id).toBe("custom-input-id");
    expect(input.getAttribute("aria-describedby")).toBe("custom-input-id-help");
    expect(screen.getByText("Your unique login name")).toBeDefined();
  });

  it("renders with generated id and displays string or FieldError error messages", () => {
    const { rerender } = render(
      <FormField name="email" error="invalid email address" />,
    );

    expect(screen.getByText("Invalid email address")).toBeDefined();

    rerender(
      <FormField
        name="email"
        error={{ type: "required", message: "email is required" }}
      />,
    );
    expect(screen.getByText("Email is required")).toBeDefined();
  });

  it("renders password field with toggle reveal button", () => {
    render(<FormField name="password" type="password" label="Password" />);

    const input = screen.getByLabelText("Password") as HTMLInputElement;
    expect(input.type).toBe("password");

    const toggle = screen.getByRole("button", { name: "Show password" });
    fireEvent.click(toggle);
    expect(input.type).toBe("text");
    expect(toggle.getAttribute("aria-label")).toBe("Hide password");

    fireEvent.click(toggle);
    expect(input.type).toBe("password");

    render(
      <FormField
        name="password_err"
        type="password"
        label="Password Error"
        error="Password required"
      />,
    );
    expect(screen.getByText("Password required")).toBeDefined();
  });

  it("renders password field without toggle when hidePasswordToggle is true", () => {
    render(
      <FormField
        name="password"
        type="password"
        label="Password"
        description="Password help text"
        hidePasswordToggle
      />,
    );

    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByText("Password help text")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("forwards ref to underlying input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<FormField ref={ref} name="test" label="Ref Field" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.getAttribute("aria-describedby")).toBeNull();
  });
});
