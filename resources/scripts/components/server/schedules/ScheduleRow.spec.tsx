import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import ScheduleRow from "@/components/server/schedules/ScheduleRow";
import { Schedule } from "@/api/server/schedules/getServerSchedules";
import { store } from "@/state";

const baseSchedule: Schedule = {
  id: 1,
  name: "Restart Schedule",
  cron: {
    minute: "30",
    hour: "4",
    dayOfMonth: "*",
    month: "*",
    dayOfWeek: "*",
  },
  isActive: true,
  isProcessing: false,
  onlyWhenOnline: true,
  lastRunAt: null,
  nextRunAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  tasks: [
    {
      id: 1,
      sequenceId: 1,
      action: "power",
      payload: "restart",
      timeOffset: 0,
      isQueued: false,
      continueOnFailure: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

describe("ScheduleRow", () => {
  beforeEach(() => {
    store.getActions().settings.setSettings({
      name: "Aquadactyl",
      locale: "en",
      recaptcha: { enabled: false, siteKey: "" },
      blueprint: { disable_attribution: true },
      timezone: "America/New_York",
    });
  });

  it("renders schedule details, timezone, step count, and Enabled badge", () => {
    render(<ScheduleRow schedule={baseSchedule} />);

    expect(screen.getByText("Restart Schedule")).toBeDefined();
    expect(screen.getByText(/America\/New_York/)).toBeDefined();
    expect(screen.getByText(/1 step · Last run: Never/)).toBeDefined();
    expect(screen.getByText("Enabled")).toBeDefined();
  });

  it("renders Paused badge and paused message when isActive is false", () => {
    render(
      <ScheduleRow
        schedule={{
          ...baseSchedule,
          isActive: false,
        }}
      />,
    );

    expect(screen.getByText("Paused")).toBeDefined();
    expect(screen.getByText("Automatic runs are paused")).toBeDefined();
  });

  it("renders Running badge when isProcessing is true", () => {
    render(
      <ScheduleRow
        schedule={{
          ...baseSchedule,
          isProcessing: true,
        }}
      />,
    );

    expect(screen.getByText("Running")).toBeDefined();
  });

  it("renders multiple steps, lastRunAt, and nextRunAt dates", () => {
    const runDate = new Date("2026-05-10T12:00:00Z");
    render(
      <ScheduleRow
        schedule={{
          ...baseSchedule,
          tasks: [...baseSchedule.tasks, { ...baseSchedule.tasks[0], id: 2 }],
          lastRunAt: runDate,
          nextRunAt: runDate,
        }}
      />,
    );

    expect(screen.getByText(/2 steps · Last run:/)).toBeDefined();
    expect(screen.getByText(/Next run:/)).toBeDefined();
  });

  it("falls back to UTC when timezone is not provided", () => {
    store.getActions().settings.setSettings(undefined as any);
    render(<ScheduleRow schedule={baseSchedule} />);

    expect(screen.getByText(/UTC/)).toBeDefined();
  });
});
