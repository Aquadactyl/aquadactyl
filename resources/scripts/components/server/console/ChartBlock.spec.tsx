import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import ChartBlock from "@/components/server/console/ChartBlock";

describe("ChartBlock", () => {
  it("renders title and children", () => {
    render(
      <ChartBlock title={"Network Inbound"}>
        <div data-testid={"chart-canvas"}>Chart Content</div>
      </ChartBlock>,
    );

    expect(screen.getByText("Network Inbound")).toBeDefined();
    expect(screen.getByTestId("chart-canvas")).toBeDefined();
  });

  it("renders legend when provided", () => {
    render(
      <ChartBlock
        title={"Memory Usage"}
        legend={<span data-testid={"chart-legend"}>2 GB / 4 GB</span>}
      >
        <div>Chart Content</div>
      </ChartBlock>,
    );

    expect(screen.getByTestId("chart-legend")).toBeDefined();
    expect(screen.getByText("2 GB / 4 GB")).toBeDefined();
  });
});
