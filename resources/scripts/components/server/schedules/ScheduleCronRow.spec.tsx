import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ScheduleCronRow from "./ScheduleCronRow";

describe("components/server/schedules/ScheduleCronRow", () => {
  it("renders cron row with all fields and custom className", () => {
    const cron = {
      minute: "*/5",
      hour: "12",
      dayOfMonth: "*",
      month: "*",
      dayOfWeek: "1-5",
    };

    const { container } = render(
      <ScheduleCronRow cron={cron} className="custom-cron-class" />,
    );

    expect(screen.getByText("*/5")).toBeTruthy();
    expect(screen.getByText("Minute")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("Hour")).toBeTruthy();
    expect(screen.getByText("Day (Month)")).toBeTruthy();
    expect(screen.getByText("Month")).toBeTruthy();
    expect(screen.getByText("1-5")).toBeTruthy();
    expect(screen.getByText("Day (Week)")).toBeTruthy();
    expect(container.firstChild).toHaveProperty("className");
    expect(
      (container.firstChild as HTMLElement).classList.contains(
        "custom-cron-class",
      ),
    ).toBe(true);
  });
});
