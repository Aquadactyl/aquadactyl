import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import SearchContainer from "./SearchContainer";

let keydownCallback: ((e: any) => void) | null = null;
vi.mock("@/plugins/useEventListener", () => ({
  default: (event: string, callback: any) => {
    if (event === "keydown") {
      keydownCallback = callback;
    }
  },
}));

vi.mock("@/components/dashboard/search/SearchModal", () => ({
  default: ({ visible, onDismissed }: any) => (
    <div data-testid="search-modal" data-visible={visible}>
      <button onClick={onDismissed}>Close Modal</button>
    </div>
  ),
}));

vi.mock("@/components/elements/tooltip/Tooltip", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/plugins/usePanelTranslation", () => ({
  default: () => ({ t: (_k: string, fallback?: string) => fallback || _k }),
}));

describe("SearchContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    keydownCallback = null;
  });

  it("renders search trigger button and opens modal on click", async () => {
    render(<SearchContainer />);

    expect(screen.queryByTestId("search-modal")).toBeNull();
    const button = screen.getByRole("button", { name: /Search/i });
    fireEvent.click(button);

    expect(await screen.findByTestId("search-modal")).toBeDefined();
  });

  it("closes modal when onDismissed is called", async () => {
    render(<SearchContainer />);

    fireEvent.click(screen.getByRole("button", { name: /Search/i }));
    expect(await screen.findByTestId("search-modal")).toBeDefined();

    fireEvent.click(screen.getByText("Close Modal"));
    expect(screen.queryByTestId("search-modal")).toBeNull();
  });

  it("opens modal on Ctrl+/ keyboard shortcut outside of input elements", async () => {
    render(<SearchContainer />);

    const preventDefault = vi.fn();
    act(() => {
      keydownCallback!({
        target: { tagName: "DIV" },
        ctrlKey: true,
        metaKey: false,
        key: "/",
        preventDefault,
      });
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(await screen.findByTestId("search-modal")).toBeDefined();
  });

  it("opens modal on Meta+/ (Cmd+/) keyboard shortcut", async () => {
    render(<SearchContainer />);

    const preventDefault = vi.fn();
    act(() => {
      keydownCallback!({
        target: { tagName: "BODY" },
        ctrlKey: false,
        metaKey: true,
        key: "/",
        preventDefault,
      });
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(await screen.findByTestId("search-modal")).toBeDefined();
  });

  it("ignores keydown shortcut if target is an input or textarea", () => {
    render(<SearchContainer />);

    const preventDefault = vi.fn();
    act(() => {
      keydownCallback!({
        target: { tagName: "INPUT" },
        ctrlKey: true,
        key: "/",
        preventDefault,
      });
      keydownCallback!({
        target: { tagName: "TEXTAREA" },
        metaKey: true,
        key: "/",
        preventDefault,
      });
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(screen.queryByTestId("search-modal")).toBeNull();
  });

  it("ignores non-matching key combinations", () => {
    render(<SearchContainer />);

    const preventDefault = vi.fn();
    act(() => {
      keydownCallback!({
        target: { tagName: "DIV" },
        ctrlKey: false,
        metaKey: false,
        key: "/",
        preventDefault,
      });
      keydownCallback!({
        target: { tagName: "DIV" },
        ctrlKey: true,
        key: "k",
        preventDefault,
      });
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(screen.queryByTestId("search-modal")).toBeNull();
  });

  it("defaults to input when event target has no tagName", () => {
    render(<SearchContainer />);

    const preventDefault = vi.fn();
    act(() => {
      keydownCallback!({
        target: {},
        ctrlKey: true,
        key: "/",
        preventDefault,
      });
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(screen.queryByTestId("search-modal")).toBeNull();
  });
});
