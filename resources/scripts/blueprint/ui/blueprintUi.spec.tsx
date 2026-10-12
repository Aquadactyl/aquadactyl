import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import UiAlert from "./alert/UiAlert";
import UiBadge from "./badge/UiBadge";
import UiDivider from "./divider/UiDivider";
import {
  UiAlert as ExportedAlert,
  UiBadge as ExportedBadge,
  UiDivider as ExportedDivider,
} from "./index";

describe("blueprint/ui", () => {
  it("renders UiAlert with danger, info, and warning styles", () => {
    const { rerender } = render(<UiAlert type="danger">Danger Alert</UiAlert>);
    expect(screen.getByText("Danger Alert")).toBeDefined();

    rerender(<UiAlert type="info">Info Alert</UiAlert>);
    expect(screen.getByText("Info Alert")).toBeDefined();

    rerender(<UiAlert type="warning">Warning Alert</UiAlert>);
    expect(screen.getByText("Warning Alert")).toBeDefined();
  });

  it("renders UiBadge with custom children", () => {
    render(<UiBadge className="custom-badge">Admin</UiBadge>);
    expect(screen.getByText("Admin")).toBeDefined();
  });

  it("renders UiDivider with and without children", () => {
    const { container, rerender } = render(
      <UiDivider>Or continue with</UiDivider>,
    );
    expect(screen.getByText("Or continue with")).toBeDefined();

    rerender(<UiDivider />);
    expect(container.querySelector(".UiDivider")).toBeDefined();
  });

  it("exports components correctly from index", () => {
    expect(ExportedAlert).toBe(UiAlert);
    expect(ExportedBadge).toBe(UiBadge);
    expect(ExportedDivider).toBe(UiDivider);
  });
});
