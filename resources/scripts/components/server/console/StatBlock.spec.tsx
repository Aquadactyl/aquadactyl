import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import StatBlock from "@/components/server/console/StatBlock";
import { Cpu } from "lucide-react";

describe("StatBlock", () => {
  it("renders title, value children, and icon", () => {
    render(
      <StatBlock title={"CPU Load"} icon={Cpu} color={"bg-red-500"}>
        <span>42%</span>
      </StatBlock>,
    );

    expect(screen.getByText("CPU Load")).toBeDefined();
    expect(screen.getByText("42%")).toBeDefined();
  });

  it("applies default color styles when color is not provided", () => {
    const { container } = render(
      <StatBlock title={"Memory"} icon={Cpu}>
        <span>512 MB</span>
      </StatBlock>,
    );

    const statusBar = container.querySelector(".status_bar");
    expect(statusBar?.className).toContain("bg-gray-700");
  });
});
