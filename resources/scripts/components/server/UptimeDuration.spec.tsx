import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UptimeDuration from "./UptimeDuration";

describe("components/server/UptimeDuration", () => {
  it("formats uptime with days when uptime >= 1 day", () => {
    // 1 day, 2 hours, 3 minutes = 86400 + 7200 + 180 = 93780
    render(<UptimeDuration uptime={93780} />);
    expect(screen.getByText("1d 2h 3m")).toBeDefined();
  });

  it("formats uptime with hours, minutes, and seconds when uptime < 1 day", () => {
    // 2 hours, 3 minutes, 4 seconds = 7200 + 180 + 4 = 7384
    render(<UptimeDuration uptime={7384} />);
    expect(screen.getByText("2h 3m 4s")).toBeDefined();
  });
});
