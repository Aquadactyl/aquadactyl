import { render, screen } from "@testing-library/react";
import React, { createRef } from "react";
import { describe, expect, it } from "vitest";
import _Button from "./Button";
import { Button } from "./index";
import { Options } from "./types";

describe("components/elements/button/Button", () => {
  it("renders default primary button", () => {
    render(<Button>Click Me</Button>);
    const btn = screen.getByRole("button", { name: "Click Me" });
    expect(btn.className).toContain("btn");
    expect(btn.className).toContain("btn-primary");
    expect(btn.className).not.toContain("btn-secondary");
  });

  it("applies secondary variant, square shape, and size classes", () => {
    const { rerender } = render(
      <Button
        variant={Options.Variant.Secondary}
        shape={Options.Shape.IconSquare}
        size={Options.Size.Small}
      >
        Options
      </Button>,
    );
    let btn = screen.getByRole("button", { name: "Options" });
    expect(btn.className).toContain("btn-secondary");
    expect(btn.className).toContain("btn-square");
    expect(btn.className).toContain("btn-small");

    rerender(<Button size={Options.Size.Large}>Options</Button>);
    btn = screen.getByRole("button", { name: "Options" });
    expect(btn.className).toContain("btn-large");
  });

  it("renders Button.Text and Button.Danger compound components", () => {
    const { rerender } = render(<Button.Text>Cancel</Button.Text>);
    let btn = screen.getByRole("button", { name: "Cancel" });
    expect(btn.className).toContain("btn-text");

    rerender(<Button.Danger>Delete</Button.Danger>);
    btn = screen.getByRole("button", { name: "Delete" });
    expect(btn.className).toContain("btn-danger");
  });

  it("forwards ref to HTMLButtonElement", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Button</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("re-exports Button from index.ts matching default export", () => {
    expect(Button).toBe(_Button);
    expect(Button.Sizes).toBe(Options.Size);
    expect(Button.Shapes).toBe(Options.Shape);
    expect(Button.Variants).toBe(Options.Variant);
  });
});
