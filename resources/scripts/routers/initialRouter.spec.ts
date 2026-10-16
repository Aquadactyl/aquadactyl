import { describe, expect, it, vi } from "vitest";
import { loadInitialRouter } from "./initialRouter";

vi.mock("./AuthenticationRouter", () => ({ default: () => null }));
vi.mock("./ServerRouter", () => ({ default: () => null }));
vi.mock("./DashboardRouter", () => ({ default: () => null }));

describe("initial router selection", () => {
  it.each([
    ["/auth/login", "auth"],
    ["/auth/password", "auth"],
    ["/server/identifier/files", "server"],
    ["/", "dashboard"],
    ["/account/api", "dashboard"],
  ])("loads the shell for %s", async (path, kind) => {
    const router = await loadInitialRouter(path);
    expect(router.kind).toBe(kind);
    expect(router.Component).toBeTypeOf("function");
  });
});
