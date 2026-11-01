import { describe, expect, it } from "vitest";
import routes from "./routes";

describe("blueprint/extends/routers/routes", () => {
  it("exports account and server routes registry", () => {
    expect(routes).toBeDefined();
    expect(Array.isArray(routes.account)).toBe(true);
    expect(Array.isArray(routes.server)).toBe(true);
  });
});
