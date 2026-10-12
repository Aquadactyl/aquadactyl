import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import FormFieldWrapper from "./FormFieldWrapper";

describe("components/elements/FormFieldWrapper", () => {
  it("renders with custom id, label, description, and custom className", () => {
    render(
      <FormFieldWrapper
        id="wrapper-id"
        label="Wrapper Label"
        description="Helper description"
        className="custom-wrapper-class"
      >
        <input id="wrapper-id" />
      </FormFieldWrapper>,
    );

    expect(screen.getByText("Wrapper Label")).toBeDefined();
    expect(screen.getByText("Helper description")).toBeDefined();
    expect(screen.getByRole("textbox")).toBeDefined();
  });

  it("renders error message from string or FieldError object", () => {
    const { rerender } = render(
      <FormFieldWrapper error="field error">
        <input />
      </FormFieldWrapper>,
    );

    expect(screen.getByText("Field error")).toBeDefined();

    rerender(
      <FormFieldWrapper error={{ type: "min", message: "too short" }}>
        <input />
      </FormFieldWrapper>,
    );
    expect(screen.getByText("Too short")).toBeDefined();
  });

  it("renders without label or help text when omitted", () => {
    const { container } = render(
      <FormFieldWrapper>
        <input data-testid="plain-input" />
      </FormFieldWrapper>,
    );

    expect(screen.getByTestId("plain-input")).toBeDefined();
    expect(container.querySelector("label")).toBeNull();
    expect(container.querySelector(".input-help")).toBeNull();
  });
});
