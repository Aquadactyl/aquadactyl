import { describe, expect, it } from "vitest";
import routes from "./routes";

describe("routers/routes", () => {
  it("defines account route definitions with paths and components", () => {
    expect(routes.account).toBeInstanceOf(Array);
    expect(routes.account.length).toBeGreaterThanOrEqual(4);

    const paths = routes.account.map((r) => r.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/api");
    expect(paths).toContain("/ssh");
    expect(paths).toContain("/activity");

    for (const route of routes.account) {
      expect(route).toHaveProperty("path");
      expect(route).toHaveProperty("component");
    }
  });

  it("defines server route definitions with permission metadata", () => {
    expect(routes.server).toBeInstanceOf(Array);
    expect(routes.server.length).toBeGreaterThanOrEqual(8);

    const paths = routes.server.map((r) => r.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/files");
    expect(paths).toContain("/databases");
    expect(paths).toContain("/schedules");
    expect(paths).toContain("/users");
    expect(paths).toContain("/backups");
    expect(paths).toContain("/network");
    expect(paths).toContain("/startup");
    expect(paths).toContain("/settings");

    for (const route of routes.server) {
      expect(route).toHaveProperty("path");
      expect(route).toHaveProperty("component");
      expect(route).toHaveProperty("permission");
    }
  });
});
