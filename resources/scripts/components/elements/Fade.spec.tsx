import React from "react";
import { render, cleanup } from "@testing-library/react";
import Fade from "./Fade";
import { describe, expect, it, vi, afterEach } from "vitest";

let capturedOnAnimationComplete: (() => void) | undefined;
let capturedOnExitComplete: (() => void) | undefined;

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children, onExitComplete }: any) => {
    capturedOnExitComplete = onExitComplete;
    return <>{children}</>;
  },
  motion: {
    div: ({ children, onAnimationComplete, className, style }: any) => {
      capturedOnAnimationComplete = onAnimationComplete;
      return (
        <div data-testid="fade-content" className={className} style={style}>
          {children}
        </div>
      );
    },
  },
}));

describe("Fade", () => {
  afterEach(cleanup);

  it("renders with default props and visible content", () => {
    const { getByText } = render(
      <Fade>
        <span>Visible Content</span>
      </Fade>,
    );
    expect(getByText("Visible Content")).toBeDefined();
  });

  it("handles unmountOnExit true when visible and when hidden", () => {
    const onExited = vi.fn();
    const { getByText, rerender, queryByText } = render(
      <Fade in={true} unmountOnExit onExited={onExited}>
        <span>Exit Content</span>
      </Fade>,
    );
    expect(getByText("Exit Content")).toBeDefined();

    rerender(
      <Fade in={false} unmountOnExit onExited={onExited}>
        <span>Exit Content</span>
      </Fade>,
    );
    expect(queryByText("Exit Content")).toBeNull();
    capturedOnExitComplete?.();
    expect(onExited).toHaveBeenCalled();
  });

  it("triggers onAnimationComplete and onExited when in is false and unmountOnExit is false", () => {
    const onExited = vi.fn();
    const { rerender } = render(
      <Fade
        in={false}
        unmountOnExit={false}
        onExited={onExited}
        className="custom-fade"
        style={{ color: "red" }}
      >
        <span>Content</span>
      </Fade>,
    );

    capturedOnAnimationComplete?.();
    expect(onExited).toHaveBeenCalledTimes(1);

    // When show is true, onAnimationComplete does not call onExited
    onExited.mockClear();
    rerender(
      <Fade in={true} unmountOnExit={false} onExited={onExited}>
        <span>Content</span>
      </Fade>,
    );
    capturedOnAnimationComplete?.();
    expect(onExited).not.toHaveBeenCalled();

    // When onExited is not provided and show is false
    rerender(
      <Fade in={false} unmountOnExit={false}>
        <span>Content</span>
      </Fade>,
    );
    capturedOnAnimationComplete?.();
  });
});
