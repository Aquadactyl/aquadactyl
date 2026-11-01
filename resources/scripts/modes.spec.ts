import { describe, it, expect } from "vitest";
import modes from "./modes";

describe("modes", () => {
  it("exports an array of modes with valid structures", () => {
    expect(Array.isArray(modes)).toBe(true);
    expect(modes.length).toBeGreaterThan(0);

    const tsMode = modes.find((m) => m.name === "TypeScript");
    expect(tsMode).toBeDefined();
    expect(tsMode?.mime).toBe("application/typescript");
    expect(tsMode?.mode).toBe("javascript");
    expect(tsMode?.ext).toContain("ts");
  });
});
