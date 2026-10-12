import { appStore } from "@/state";
import useFlash, { useFlashKey } from "./useFlash";

describe("useFlash and useFlashKey hooks", () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    appStore.getState().flashes.clearFlashes();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("useFlash provides access to flash store methods and state", () => {
    const flashes = useFlash();

    expect(typeof flashes.addFlash).toBe("function");
    expect(typeof flashes.clearFlashes).toBe("function");
    expect(typeof flashes.clearAndAddHttpError).toBe("function");
  });

  it("useFlashKey adds errors under a specific key and clears them", () => {
    const flash = useFlashKey("account:security");

    flash.addError("Invalid current password", "Authentication Error");

    const state = appStore.getState().flashes.items;
    expect(state).toHaveLength(1);
    expect(state[0]).toMatchObject({
      key: "account:security",
      message: "Invalid current password",
      title: "Authentication Error",
      type: "error",
    });

    flash.clearFlashes();
    expect(appStore.getState().flashes.items).toHaveLength(0);
  });

  it("useFlashKey clearAndAddHttpError parses Error and API response errors", () => {
    const flash = useFlashKey("server:startup");

    flash.clearAndAddHttpError(
      new Error("Unable to save environment variable"),
    );

    let state = appStore.getState().flashes.items;
    expect(state).toHaveLength(1);
    expect(state[0].message).toContain("Unable to save environment variable");

    // Replace with API error response
    flash.clearAndAddHttpError({
      response: {
        data: {
          errors: [{ detail: "Server is currently stopping" }],
        },
      },
    } as any);

    state = appStore.getState().flashes.items;
    expect(state).toHaveLength(1);
    expect(state[0].message).toBe("Server is currently stopping");
  });
});
