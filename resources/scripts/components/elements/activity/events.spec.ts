import { describe, expect, it } from "vitest";
import { activityCategory, activityEventLabel } from "./events";

describe("components/elements/activity/events", () => {
  it("determines prefix and label for events with namespace and subdomain", () => {
    const result = activityCategory("server:power.start");
    expect(result.prefix).toBe("server:power.");
    expect(result.label).toBe("Power");
  });

  it("determines prefix and label for events with namespace only", () => {
    const result = activityCategory("auth:success");
    expect(result.prefix).toBe("auth:");
    expect(result.label).toBe("Sign-in");
  });

  it("determines prefix and label for events without colon or dot", () => {
    const result = activityCategory("custom_event");
    expect(result.prefix).toBe("custom_event");
    expect(result.label).toBe("Custom event");
  });

  it("humanizes unknown category names", () => {
    const result = activityCategory("server:custom_category.action");
    expect(result.prefix).toBe("server:custom_category.");
    expect(result.label).toBe("Custom category");
  });

  it("returns mapped label for known events", () => {
    expect(activityEventLabel("auth:success")).toBe("Successful sign-in");
    expect(activityEventLabel("server:power.start")).toBe("Server started");
  });

  it("formats unmapped events using category and humanized action", () => {
    expect(activityEventLabel("server:power.hibernate")).toBe(
      "Power · Hibernate",
    );
    expect(activityEventLabel("standalone_event")).toBe(
      "Standalone event · Standalone event",
    );
  });
});
