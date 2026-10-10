import { describe, expect, it } from "vitest";
import {
  Cron,
  cronExpression,
  cronFromTiming,
  defaultTiming,
  delayFromSeconds,
  delayToSeconds,
  describeCron,
  describeDelay,
  formatScheduleDate,
  taskData,
  taskKind,
  timingErrors,
  timingFromCron,
} from "./scheduleHelpers";

const cron = (expression: string): Cron => {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = expression.split(" ");
  return { minute, hour, dayOfMonth, month, dayOfWeek };
};

describe("schedule timing", () => {
  it.each([
    ["* * * * *", "Every minute"],
    ["*/15 * * * *", "Every 15 minutes"],
    ["20 */4 * * *", "Every 4 hours, at 20 minutes past the hour"],
    ["30 * * * *", "Every hour, at 30 minutes past the hour"],
    ["5 3 * * *", "Every day at 03:05"],
    ["0 18 * * 5", "Every Friday at 18:00"],
    ["10 7 31 * *", "On day 31 of each month at 07:10"],
  ])(
    "preserves the execution times of %s when edited in basic mode",
    (expression, description) => {
      const original = cron(expression);
      const timing = timingFromCron(original);
      expect(timing.frequency).not.toBe("custom");
      expect(cronExpression(cronFromTiming(timing, original))).toBe(expression);
      expect(describeCron(original)).toBe(description);
    },
  );

  it.each([
    "*/7 * * * *", // This does not run at an even seven-minute interval across hour boundaries.
    "0 */5 * * *", // This does not run every five hours across midnight.
    "0 3 * * 1-5",
    "0 3 1 * 1", // Cron combines day-of-month and day-of-week rules.
    "0 3 L * *",
    "0 3 * JAN MON",
    "0,30 6,18 * * *",
  ])("leaves advanced cron %s unchanged", (expression) => {
    const original = cron(expression);
    const timing = timingFromCron(original);
    expect(timing.frequency).toBe("custom");
    expect(cronFromTiming(timing, original)).toEqual(original);
  });

  it("treats both supported Sunday representations as Sunday", () => {
    expect(describeCron(cron("0 3 * * 7"))).toBe("Every Sunday at 03:00");
    expect(describeCron(cron("0 3 * * 0"))).toBe("Every Sunday at 03:00");
  });

  it("changes the frequency without carrying over incompatible day/month constraints", () => {
    const original = cron("0 3 L JAN MON");
    expect(
      cronFromTiming(
        {
          ...defaultTiming,
          frequency: "weekly",
          weekday: "2",
          time: "17:45",
        },
        original,
      ),
    ).toEqual(cron("45 17 * * 2"));
  });

  it.each([
    { frequency: "daily" as const, time: "24:00" },
    { frequency: "daily" as const, time: "" },
    { frequency: "daily" as const, time: "03:60" },
    { frequency: "weekly" as const, weekday: "7" },
    { frequency: "monthly" as const, monthDay: "0" },
    { frequency: "monthly" as const, monthDay: "32" },
    { frequency: "hours" as const, hourMinute: "1.5" },
    { frequency: "hours" as const, hourInterval: "5" },
    { frequency: "minutes" as const, minuteInterval: "7" },
  ])("rejects invalid basic settings %o", (changes) => {
    const timing = { ...defaultTiming, ...changes };
    expect(Object.keys(timingErrors(timing)).length).toBeGreaterThan(0);
    expect(() => cronFromTiming(timing, cron("0 3 * * *"))).toThrow(
      Object.values(timingErrors(timing))[0],
    );
  });

  it("formats next runs in the panel timezone, including daylight saving", () => {
    expect(
      formatScheduleDate(new Date("2026-01-15T03:00:00Z"), "Europe/London"),
    ).toBe("15 Jan 2026, 03:00");
    expect(
      formatScheduleDate(new Date("2026-07-15T03:00:00Z"), "Europe/London"),
    ).toBe("15 Jul 2026, 04:00");
    expect(
      formatScheduleDate(new Date("2026-07-15T03:00:00Z"), "America/New_York"),
    ).toBe("14 Jul 2026, 23:00");
    expect(
      formatScheduleDate(new Date("2026-07-15T03:00:00Z"), "invalid-zone"),
    ).toBe("2026-07-15 03:00 UTC");
  });
});

describe("schedule steps", () => {
  it.each(["start", "restart", "stop", "kill"] as const)(
    "preserves the API power action %s",
    (kind) => {
      expect(taskData(kind, "unused")).toEqual({
        action: "power",
        payload: kind,
      });
      expect(taskKind({ action: "power", payload: kind })).toBe(kind);
    },
  );

  it("preserves commands and optional backup exclusions", () => {
    expect(taskData("command", "say Restart in five minutes")).toEqual({
      action: "command",
      payload: "say Restart in five minutes",
    });
    expect(taskData("backup", "")).toEqual({
      action: "backup",
      payload: "",
    });
    expect(taskData("backup", "logs/*\ncache/*").payload).toBe(
      "logs/*\ncache/*",
    );
  });

  it.each([0, 1, 59, 60, 90, 120, 899, 900])(
    "round-trips an existing delay of %s seconds exactly",
    (seconds) => {
      const { delay, delayUnit } = delayFromSeconds(seconds);
      expect(delayToSeconds(delay, delayUnit)).toBe(seconds);
    },
  );

  it("allows the maximum wait and describes mixed units clearly", () => {
    expect(delayToSeconds("15", "minutes")).toBe(900);
    expect(describeDelay(90)).toBe("Wait 1 minute 30 seconds");
    expect(describeDelay(0)).toBe("No wait");
  });

  it.each(["", "-1", "1.5", "1e2", "901", "not a number"])(
    "rejects an invalid wait of %s seconds",
    (amount) => {
      expect(() => delayToSeconds(amount, "seconds")).toThrow(
        "Choose a whole number up to 15 minutes (900 seconds).",
      );
    },
  );

  it("rejects waits longer than fifteen minutes", () => {
    expect(() => delayToSeconds("16", "minutes")).toThrow(
      "Choose a whole number up to 15 minutes (900 seconds).",
    );
  });
});
