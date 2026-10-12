import { renderHook, act } from "@testing-library/react";
import { usePersistedState } from "./usePersistedState";

describe("usePersistedState hook", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default value when localStorage has no entry", () => {
    const { result } = renderHook(() =>
      usePersistedState("panel.view_mode", "grid"),
    );

    const [value] = result.current;
    expect(value).toBe("grid");
  });

  it("loads stored JSON value from localStorage on initialization", () => {
    localStorage.setItem("panel.file_editor_theme", JSON.stringify("dracula"));

    const { result } = renderHook(() =>
      usePersistedState("panel.file_editor_theme", "default"),
    );

    const [value] = result.current;
    expect(value).toBe("dracula");
  });

  it("persists state updates to localStorage", () => {
    const { result } = renderHook(() =>
      usePersistedState("panel.sidebar_collapsed", false),
    );

    act(() => {
      const [, setValue] = result.current;
      setValue(true);
    });

    const [updatedValue] = result.current;
    expect(updatedValue).toBe(true);
    expect(localStorage.getItem("panel.sidebar_collapsed")).toBe("true");
  });

  it("gracefully falls back to defaultValue if localStorage item contains invalid JSON", () => {
    localStorage.setItem("corrupted.key", "{not valid json");

    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const { result } = renderHook(() =>
      usePersistedState("corrupted.key", { fallback: true }),
    );

    const [value] = result.current;
    expect(value).toEqual({ fallback: true });

    consoleWarnSpy.mockRestore();
  });
});
