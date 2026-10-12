import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import InputSpinner from "./InputSpinner";

describe("components/elements/InputSpinner", () => {
  it("renders with visible true and false", () => {
    const { rerender, container } = render(
      <InputSpinner visible={true}>
        <input placeholder="Search" />
      </InputSpinner>,
    );

    expect(screen.getByPlaceholderText("Search")).toBeDefined();
    expect(container.firstChild).toHaveProperty("className");
    expect((container.firstChild as HTMLElement).className).toContain(
      "[&_select]:bg-none",
    );

    rerender(
      <InputSpinner visible={false}>
        <input placeholder="Search" />
      </InputSpinner>,
    );
    expect((container.firstChild as HTMLElement).className).not.toContain(
      "[&_select]:bg-none",
    );
  });
});
