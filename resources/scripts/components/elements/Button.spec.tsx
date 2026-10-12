import React from "react";
import { render, cleanup } from "@testing-library/react";
import Button, { ButtonStyle, LinkButton } from "./Button";
import { describe, expect, it, afterEach } from "vitest";

describe("components/elements/Button", () => {
  afterEach(cleanup);

  it("renders with default props and small size", () => {
    const { getByText } = render(<Button>Click Me</Button>);
    const btn = getByText("Click Me").closest("button");
    expect(btn).not.toBeNull();
    expect(btn?.className).toContain("px-4 py-2");
    expect(btn?.className).toContain("bg-primary-500");
  });

  it("renders all size variants", () => {
    const { rerender, container } = render(
      <Button size="xsmall">XSmall</Button>,
    );
    expect(container.querySelector("button")?.className).toContain("px-2 py-1");

    rerender(<Button size="small">Small</Button>);
    expect(container.querySelector("button")?.className).toContain("px-4 py-2");

    rerender(<Button size="large">Large</Button>);
    expect(container.querySelector("button")?.className).toContain(
      "p-4 text-sm",
    );

    rerender(<Button size="xlarge">XLarge</Button>);
    expect(container.querySelector("button")?.className).toContain(
      "w-full p-4",
    );
  });

  it("renders all non-secondary colors", () => {
    const { rerender, container } = render(<Button color="grey">Grey</Button>);
    expect(container.querySelector("button")?.className).toContain(
      "bg-neutral-700",
    );

    rerender(<Button color="green">Green</Button>);
    expect(container.querySelector("button")?.className).toContain(
      "bg-green-500",
    );

    rerender(<Button color="red">Red</Button>);
    expect(container.querySelector("button")?.className).toContain(
      "bg-red-500",
    );

    rerender(<Button color="primary">Primary</Button>);
    expect(container.querySelector("button")?.className).toContain(
      "bg-primary-500",
    );
  });

  it("renders all secondary colors", () => {
    const { rerender, container } = render(
      <Button isSecondary>Secondary Default</Button>,
    );
    expect(container.querySelector("button")?.className).toContain(
      "bg-transparent",
    );

    rerender(
      <Button isSecondary color="red">
        Secondary Red
      </Button>,
    );
    expect(container.querySelector("button")?.className).toContain(
      "[&:not(:disabled):hover]:bg-red-500",
    );

    rerender(
      <Button isSecondary color="primary">
        Secondary Primary
      </Button>,
    );
    expect(container.querySelector("button")?.className).toContain(
      "[&:not(:disabled):hover]:bg-primary-500",
    );

    rerender(
      <Button isSecondary color="green">
        Secondary Green
      </Button>,
    );
    expect(container.querySelector("button")?.className).toContain(
      "[&:not(:disabled):hover]:bg-green-500",
    );
  });

  it("renders Spinner and transparent text when isLoading is true", () => {
    const { getByText, container } = render(
      <Button isLoading>Loading Button</Button>,
    );
    expect(getByText("Loading Button").className).toContain("text-transparent");
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });

  it("renders LinkButton as anchor tag", () => {
    const { getByText } = render(
      <LinkButton href="https://example.com">Link</LinkButton>,
    );
    const link = getByText("Link").closest("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("https://example.com");
  });

  it("renders ButtonStyle with custom component type", () => {
    const { getByText } = render(
      <ButtonStyle as="div">Div Button</ButtonStyle>,
    );
    expect(getByText("Div Button").tagName.toLowerCase()).toBe("div");
  });
});
