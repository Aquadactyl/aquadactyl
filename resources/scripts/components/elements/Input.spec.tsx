import { render, screen } from "@testing-library/react";
import React, { createRef } from "react";
import { describe, expect, it } from "vitest";
import Input, { Textarea } from "./Input";

describe("components/elements/Input", () => {
  it("renders checkbox and radio inputs with appropriate styling", () => {
    const { rerender } = render(
      <Input type="checkbox" aria-label="Check test" />,
    );
    let el = screen.getByLabelText("Check test");
    expect(el.className).toContain("text-primary-500");
    expect(el.className).not.toContain("rounded-full");

    rerender(<Input type="radio" aria-label="Radio test" />);
    el = screen.getByLabelText("Radio test");
    expect(el.className).toContain("rounded-full");
  });

  it("renders text input with light mode and error styling", () => {
    const { rerender } = render(<Input isLight placeholder="Light input" />);
    let el = screen.getByPlaceholderText("Light input");
    expect(el.className).toContain("bg-white");
    expect(el.className).toContain("[&+.input-help]:text-neutral-400");

    rerender(<Input hasError placeholder="Error input" />);
    el = screen.getByPlaceholderText("Error input");
    expect(el.className).toContain("border-red-400");
    expect(el.className).toContain("[&+.input-help]:text-red-200");
  });

  it("forwards ref to HTMLInputElement", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} placeholder="Ref test" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("renders Textarea with default, light, and error styling", () => {
    const { rerender } = render(<Textarea placeholder="Dark textarea" />);
    let el = screen.getByPlaceholderText("Dark textarea");
    expect(el.className).toContain("bg-neutral-900");

    rerender(<Textarea isLight placeholder="Light textarea" />);
    el = screen.getByPlaceholderText("Light textarea");
    expect(el.className).toContain("bg-white");

    rerender(<Textarea hasError placeholder="Error textarea" />);
    el = screen.getByPlaceholderText("Error textarea");
    expect(el.className).toContain("border-red-400");
  });

  it("forwards ref to HTMLTextAreaElement", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} placeholder="Ref textarea" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
});
