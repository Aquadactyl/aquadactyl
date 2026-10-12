import React from "react";
import { render, fireEvent, cleanup, screen } from "@testing-library/react";
import Modal, { ModalMask } from "./Modal";
import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("@/components/elements/Fade", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/elements/Spinner", () => ({
  default: () => <div data-testid="spinner">Spinner</div>,
}));

describe("Modal", () => {
  afterEach(cleanup);

  it("renders visible modal with children and close button", () => {
    const onDismissed = vi.fn();
    render(
      <Modal visible={true} onDismissed={onDismissed}>
        <p>Modal Body Content</p>
      </Modal>,
    );

    expect(screen.getByText("Modal Body Content")).toBeDefined();
    const closeBtn = document.body.querySelector(".close-icon");
    expect(closeBtn).not.toBeNull();

    fireEvent.click(closeBtn!);
    expect(onDismissed).toHaveBeenCalled();
  });

  it("hides close button when dismissable is false", () => {
    render(
      <Modal visible={true} dismissable={false} onDismissed={vi.fn()}>
        <p>Non-dismissable modal</p>
      </Modal>,
    );

    expect(document.body.querySelector(".close-icon")).toBeNull();
  });

  it("renders spinner overlay when showSpinnerOverlay is true", () => {
    render(
      <Modal visible={true} showSpinnerOverlay={true} onDismissed={vi.fn()}>
        <p>Processing Modal</p>
      </Modal>,
    );

    expect(screen.getByTestId("spinner")).toBeDefined();
    expect(document.body.querySelector(".close-icon")).toBeNull();
  });

  it("renders with top=false without top margin", () => {
    render(
      <Modal visible={true} top={false} onDismissed={vi.fn()}>
        <p>Centered modal</p>
      </Modal>,
    );

    expect(screen.getByText("Centered modal")).toBeDefined();
  });

  it("renders ModalMask component", () => {
    const { container } = render(<ModalMask className="custom-mask" />);
    expect(container.querySelector(".custom-mask")).not.toBeNull();
  });

  it("handles Escape key dismissal and dismissal prevention", () => {
    const onDismissed = vi.fn();
    const { unmount } = render(
      <Modal visible={true} closeOnEscape={true} onDismissed={onDismissed}>
        <p>Dismissable by escape</p>
      </Modal>,
    );

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(onDismissed).toHaveBeenCalledTimes(1);
    unmount();

    // Prevented when closeOnEscape is false
    const onDismissed2 = vi.fn();
    const { unmount: unmount2 } = render(
      <Modal visible={true} closeOnEscape={false} onDismissed={onDismissed2}>
        <p>Not dismissable by escape</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(onDismissed2).not.toHaveBeenCalled();
    unmount2();

    // Prevented when isDismissable is false (e.g. dismissable={false})
    const onDismissed3 = vi.fn();
    const { unmount: unmount3 } = render(
      <Modal visible={true} dismissable={false} onDismissed={onDismissed3}>
        <p>Not dismissable at all</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(onDismissed3).not.toHaveBeenCalled();
    unmount3();
  });

  it("handles outside click dismissal and prevention", () => {
    const onDismissed = vi.fn();
    const { getByTestId, unmount } = render(
      <div>
        <button data-testid="outside-element">Outside</button>
        <Modal
          visible={true}
          closeOnBackground={false}
          onDismissed={onDismissed}
        >
          <p>Close on background false</p>
        </Modal>
      </div>,
    );

    const outsideEl = getByTestId("outside-element");
    fireEvent.pointerDown(outsideEl);
    fireEvent.mouseDown(outsideEl);
    expect(onDismissed).not.toHaveBeenCalled();
    unmount();
  });

  it("handles handleModalOpenChange directly for all branch cases", async () => {
    const { handleModalOpenChange } = await import("./Modal");
    const onDismissed = vi.fn();

    // open is true -> no-op
    handleModalOpenChange(true, undefined, true, true, true, onDismissed);
    expect(onDismissed).not.toHaveBeenCalled();

    // open is false, !isDismissable -> returns early
    handleModalOpenChange(false, undefined, false, true, true, onDismissed);
    expect(onDismissed).not.toHaveBeenCalled();

    // open is false, escape-key with !closeOnEscape -> returns early
    handleModalOpenChange(
      false,
      { reason: "escape-key" },
      true,
      false,
      true,
      onDismissed,
    );
    expect(onDismissed).not.toHaveBeenCalled();

    // open is false, outside-press with !closeOnBackground -> returns early
    handleModalOpenChange(
      false,
      { reason: "outside-press" },
      true,
      true,
      false,
      onDismissed,
    );
    expect(onDismissed).not.toHaveBeenCalled();

    // open is false, outside-press with closeOnBackground -> calls onDismissed
    handleModalOpenChange(
      false,
      { reason: "outside-press" },
      true,
      true,
      true,
      onDismissed,
    );
    expect(onDismissed).toHaveBeenCalledTimes(1);

    // open is false, undefined reason -> calls onDismissed
    handleModalOpenChange(false, undefined, true, true, true, onDismissed);
    expect(onDismissed).toHaveBeenCalledTimes(2);
  });
});
