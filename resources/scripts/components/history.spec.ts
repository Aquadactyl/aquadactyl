import { describe, expect, it } from "vitest";
import { history } from "./history";

describe("components/history", () => {
  it("exports browser history instance with v5Compat", () => {
    expect(history).toBeDefined();
    expect(history.location).toBeDefined();
    expect(typeof history.push).toBe("function");
    expect(typeof history.replace).toBe("function");
  });
});
