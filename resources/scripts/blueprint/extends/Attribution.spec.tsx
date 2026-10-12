import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import Attribution from "./Attribution";

let mockDisableAttribution = false;
vi.mock("@/state", () => ({
  useAppStore: (selector: any) =>
    selector({
      settings: {
        data: {
          blueprint: {
            disable_attribution: mockDisableAttribution,
          },
        },
      },
    }),
}));

describe("blueprint/extends/Attribution", () => {
  it("renders blueprint link when disable_attribution is false", () => {
    mockDisableAttribution = false;
    const { container } = render(<Attribution />);
    expect(container.textContent).toContain("Blueprint");
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "https://blueprint.zip",
    );
  });

  it("renders nothing when disable_attribution is true", () => {
    mockDisableAttribution = true;
    const { container } = render(<Attribution />);
    expect(container.textContent).toBe("");
    expect(container.querySelector("a")).toBeNull();
  });
});
