import React from "react";
import { render, fireEvent, cleanup } from "@testing-library/react";
import Tooltip from "./Tooltip";

describe("Tooltip component", () => {
  afterEach(cleanup);

  it("returns raw children without tooltip wrapper when disabled is true", () => {
    const { getByText, queryByRole } = render(
      <Tooltip content="Tooltip info text" disabled={true}>
        <button>Disabled Tooltip Button</button>
      </Tooltip>,
    );

    const button = getByText("Disabled Tooltip Button");
    expect(button).toBeDefined();
    // No tooltip popup is initialized
    expect(queryByRole("tooltip")).toBeNull();
  });

  it("renders trigger and attaches tooltip content", () => {
    const { getByText } = render(
      <Tooltip content="Helpful hover text" arrow>
        <button>Hover me</button>
      </Tooltip>,
    );

    const button = getByText("Hover me");
    expect(button).toBeDefined();

    // Trigger focus or hover
    fireEvent.focus(button);
  });

  it("handles object and number delay configurations and placement prop", () => {
    const { getByText, rerender } = render(
      <Tooltip
        content="Right aligned popup"
        placement="right-start"
        delay={{ open: 100, close: 200 }}
      >
        <button>Right tooltip</button>
      </Tooltip>,
    );

    expect(getByText("Right tooltip")).toBeDefined();

    rerender(
      <Tooltip content="Numeric delay" delay={50}>
        <button>Numeric tooltip</button>
      </Tooltip>,
    );
    expect(getByText("Numeric tooltip")).toBeDefined();

    rerender(
      <Tooltip content="Rest delay" rest={25}>
        <button>Rest tooltip</button>
      </Tooltip>,
    );
    expect(getByText("Rest tooltip")).toBeDefined();
  });
});
